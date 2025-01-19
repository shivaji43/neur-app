import { revalidatePath } from 'next/cache';

import {
  CoreTool,
  Message,
  NoSuchToolError,
  appendResponseMessages,
  createDataStreamResponse,
  generateObject,
  streamText,
} from 'ai';
import { z } from 'zod';

import {
  defaultModel,
  defaultSystemPrompt,
  defaultTools,
  getToolsFromRequiredTools,
} from '@/ai/providers';
import { MAX_TOKEN_MESSAGES } from '@/lib/constants';
import { isValidTokenUsage } from '@/lib/utils';
import { getUnconfirmedConfirmationMessage } from '@/lib/utils/ai';
import {
  convertUserResponseToBoolean,
  generateTitleFromUserMessage,
} from '@/server/actions/ai';
import { getToolsFromOrchestrator } from '@/server/actions/orchestrator';
import { verifyUser } from '@/server/actions/user';
import {
  dbCreateConversation,
  dbCreateMessages,
  dbCreateTokenStat,
  dbDeleteConversation,
  dbGetConversation,
  dbGetConversationMessages,
  dbUpdateMessageToolInvocations,
} from '@/server/db/queries';
import { ToolUpdate } from '@/types/util';

export const maxDuration = 120;

function getConfirmationResult(message: Message) {
  console.dir(message, { depth: null });
  const invocation = message.toolInvocations?.[0];
  const result = (invocation as any)?.result?.result;
  console.log(result);
  return (
    (message.role === 'assistant' &&
      invocation?.toolName === 'askForConfirmation' &&
      invocation?.state === 'result' &&
      result) ||
    undefined
  );
}

async function handleConfirmation({
  current,
  unconfirmed,
}: {
  current: Message;
  unconfirmed: Message | undefined;
}): Promise<{ confirmed: boolean; updates: ToolUpdate[] }> {
  const result = getConfirmationResult(current);
  let invocations;
  let isConfirmed = !!result;
  if (!unconfirmed) return { confirmed: false, updates: [] };
  if (current.role === 'user') {
    isConfirmed = await convertUserResponseToBoolean(current.content);
    invocations = unconfirmed.toolInvocations?.map((inv) =>
      inv.toolName === 'askForConfirmation'
        ? {
            ...inv,
            result: {
              result: isConfirmed ? 'confirm' : 'deny',
              message: unconfirmed.content,
            },
          }
        : inv,
    );
  } else if (!!result) {
    invocations = current.toolInvocations;
  }
  if (invocations) {
    await dbUpdateMessageToolInvocations({
      messageId: unconfirmed.id,
      toolInvocations: JSON.parse(JSON.stringify(invocations)),
    });
  }
  const updates = (unconfirmed.toolInvocations || []).map((inv) => ({
    type: 'tool-update' as const,
    toolCallId: inv.toolCallId,
    result: isConfirmed ? 'confirm' : 'deny',
  }));
  return { confirmed: isConfirmed, updates };
}

export async function POST(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;
  const publicKey = session?.data?.data?.publicKey;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!publicKey) {
    console.error('[chat/route] No public key found');
    return new Response('No public key found', { status: 400 });
  }

  try {
    const { id: conversationId, message }: { id: string; message: Message } =
      await req.json();
    if (!message) return new Response('No message found', { status: 400 });

    const existingMessages =
      (await dbGetConversationMessages({
        conversationId,
        limit: MAX_TOKEN_MESSAGES,
      })) ?? [];

    if (existingMessages.length === 0 && message.role !== 'user') {
      return new Response('No user message found', { status: 400 });
    }

    if (existingMessages.length === 0) {
      const title = await generateTitleFromUserMessage({
        message: message.content,
      });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations');
    }

    const newUserMessage =
      message.role === 'user'
        ? await dbCreateMessages({
            messages: [
              {
                conversationId,
                role: 'user',
                content: message.content,
                toolInvocations: [],
                experimental_attachments: message.experimental_attachments
                  ? JSON.parse(JSON.stringify(message.experimental_attachments))
                  : undefined,
              },
            ],
          })
        : null;

    const unconfirmed = getUnconfirmedConfirmationMessage(existingMessages);
    const { confirmed, updates } = await handleConfirmation({
      current: message,
      unconfirmed,
    });

    const attachments = existingMessages
      .filter((m) => m.experimental_attachments)
      .flatMap((m) => m.experimental_attachments!)
      .map((a) => ({ type: a.contentType, data: a.url }));

    const systemPrompt = [
      defaultSystemPrompt,
      `History of attachments: ${JSON.stringify(attachments)}`,
      `User Solana wallet public key: ${publicKey}`,
      `User ID: ${userId}`,
      `Conversation ID: ${conversationId}`,
    ].join('\n\n');

    const relevant = existingMessages.filter((m) => m.content !== '');

    const confirmationResult = getConfirmationResult(message);
    if (confirmationResult !== undefined) {
      relevant.push({
        id: message.id,
        content: confirmationResult,
        role: 'user',
        createdAt: new Date(),
      });
    } else {
      relevant.push(message);
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        if (updates.length) {
          updates.forEach((u) => dataStream.writeData(u));
        }
        const { toolsRequired, usage: orchestratorUsage } =
          await getToolsFromOrchestrator(relevant, confirmed);
        const tools = toolsRequired
          ? getToolsFromRequiredTools(toolsRequired)
          : defaultTools;
        const result = streamText({
          model: defaultModel,
          system: systemPrompt,
          tools: tools as Record<string, CoreTool<any, any>>,
          experimental_toolCallStreaming: true,
          experimental_telemetry: {
            isEnabled: true,
            functionId: 'stream-text',
          },
          experimental_repairToolCall: async ({
            toolCall,
            tools,
            parameterSchema,
            error,
          }) => {
            if (NoSuchToolError.isInstance(error)) {
              return null;
            }

            console.log('[chat/route] repairToolCall', toolCall);

            const tool = tools[toolCall.toolName as keyof typeof tools];
            const { object: repairedArgs } = await generateObject({
              model: defaultModel,
              schema: tool.parameters as z.ZodType<any>,
              prompt: [
                `The model tried to call the tool "${toolCall.toolName}"` +
                  ` with the following arguments:`,
                JSON.stringify(toolCall.args),
                `The tool accepts the following schema:`,
                JSON.stringify(parameterSchema(toolCall)),
                'Please fix the arguments.',
              ].join('\n'),
            });
            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          },
          maxSteps: 15,
          messages: relevant,
          async onFinish({ response, usage }) {
            if (!userId) return;
            try {
              const finalMessages = appendResponseMessages({
                messages: [],
                responseMessages: response.messages,
              }).filter(
                (m) =>
                  // Accept either a non-empty message or a tool invocation
                  m.content !== '' || (m.toolInvocations || []).length !== 0,
              );
              const saved = await dbCreateMessages({
                messages: finalMessages.map((m) => ({
                  conversationId,
                  createdAt: m.createdAt,
                  role: m.role,
                  content: m.content,
                  toolInvocations: m.toolInvocations
                    ? JSON.parse(JSON.stringify(m.toolInvocations))
                    : undefined,
                  experimental_attachments: m.experimental_attachments
                    ? JSON.parse(JSON.stringify(m.experimental_attachments))
                    : undefined,
                })),
              });
              if (saved && newUserMessage && isValidTokenUsage(usage)) {
                let { promptTokens, completionTokens, totalTokens } = usage;
                if (isValidTokenUsage(orchestratorUsage)) {
                  promptTokens += orchestratorUsage.promptTokens;
                  completionTokens += orchestratorUsage.completionTokens;
                  totalTokens += orchestratorUsage.totalTokens;
                }
                const messageIds = [...newUserMessage, ...saved].map(
                  (m) => m.id,
                );
                await dbCreateTokenStat({
                  userId,
                  messageIds,
                  promptTokens,
                  completionTokens,
                  totalTokens,
                });
              }
              revalidatePath('/api/conversations');
            } catch (error) {
              console.error('[chat/route] Failed to save messages', error);
            }
          },
        });
        result.mergeIntoDataStream(dataStream);
      },
    });
  } catch (error) {
    console.error('[chat/route] Unexpected error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id: conversationId } = await req.json();
    await dbDeleteConversation({ conversationId, userId });
    revalidatePath('/api/conversations');

    return new Response('Conversation deleted', { status: 200 });
  } catch (error) {
    console.error('[chat/route] Delete error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
