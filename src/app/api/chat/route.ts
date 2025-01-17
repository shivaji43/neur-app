import { revalidatePath } from 'next/cache';

import {
  CoreMessage,
  CoreTool,
  Message,
  NoSuchToolError,
  Output,
  appendResponseMessages,
  convertToCoreMessages,
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
import {
  getMostRecentConfirmationMessage,
  getMostRecentToolResultMessage,
  getMostRecentUserMessage,
  getToolMessageResult,
  sanitizeResponseMessages,
  updateConfirmationMessageResult,
} from '@/lib/utils/ai';
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
  updateToolCallResults,
} from '@/server/db/queries';
import { ToolUpdate } from '@/types/util';

export const maxDuration = 120;

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
    const {
      id: conversationId,
      message,
    }: {
      id: string;
      message: Message;
    } = await req.json();

    console.log('[chat/route] message', message);

    if (!message) {
      return new Response('No message found', { status: 400 });
    }

    const isUserMessage = message.role === 'user';

    const genericMessage = message as Message;

    const mostRecentToolResultMessage =
      message.role === 'assistant' &&
      genericMessage.toolInvocations &&
      genericMessage.toolInvocations.length > 0 &&
      genericMessage.toolInvocations[0].state === 'result' &&
      genericMessage.toolInvocations[0].result !== undefined;

    const conversation = await dbGetConversation({
      conversationId,
      includeMessages: true,
    });

    if (!conversation && !isUserMessage) {
      return new Response('No user message found', { status: 400 });
    }

    if (!conversation) {
      const title = await generateTitleFromUserMessage({
        message: message.content,
      });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations');
    }

    console.log('[chat/route] conversation', conversation);

    let toolUpdates: Array<ToolUpdate> = [];
    let newUserMessage: Awaited<ReturnType<typeof dbCreateMessages>> = null;

    if (isUserMessage) {
      newUserMessage = await dbCreateMessages({
        messages: [
          {
            conversationId,
            role: message.role,
            content: message.content,
            toolInvocations: [],
            experimental_attachments: message.experimental_attachments
              ? JSON.parse(JSON.stringify(message.experimental_attachments))
              : undefined,
          },
        ],
      });
    }

    const conversationMessages = (conversation?.messages as Message[]) || [];

    // extract all attachments from the user message
    const attachments = conversationMessages
      .filter((message) => message.experimental_attachments)
      .map((message) => message.experimental_attachments)
      .flat()
      .map((attachment) => {
        return {
          type: attachment?.contentType,
          data: attachment?.url,
        };
      });
    // append to system prompt
    const systemPrompt =
      defaultSystemPrompt +
      `\n\nHistory of attachments: ${JSON.stringify(attachments)}` +
      `\n\nUser Solana wallet public key: ${publicKey}` +
      `\n\nUser ID: ${userId}` +
      `\n\nConversation ID: ${conversationId}`;

    // Filter to relevant messages for context sizing
    const relevantMessages = [
      ...conversationMessages.slice(-MAX_TOKEN_MESSAGES),
      message,
    ];

    console.log('[chat/route] createDataStreamResponse');

    return createDataStreamResponse({
      execute: async (dataStream) => {
        if (toolUpdates.length > 0) {
          toolUpdates.forEach((update) => {
            dataStream.writeData(update);
          });

          toolUpdates = [];
        }

        // Run messages through orchestration
        const { toolsRequired, usage: orchestratorUsage } =
          await getToolsFromOrchestrator(relevantMessages);

        console.log('[chat/route] toolsRequired', toolsRequired);

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

            console.log('[chat/route] repairedArgs', repairedArgs);
            console.log('[chat/route] toolCall', toolCall);

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
          },

          maxSteps: 15,
          messages: relevantMessages,
          async onFinish({ response, usage, toolCalls, toolResults, steps }) {
            if (!userId) return;

            try {
              const sanitizedResponses = appendResponseMessages({
                messages: [],
                responseMessages: response.messages,
              });

              console.dir(sanitizedResponses, { depth: null });

              // Create messages and get their IDs back
              const messages = await dbCreateMessages({
                messages: sanitizedResponses.map((message) => {
                  return {
                    conversationId,
                    role: message.role,
                    content: message.content,
                    toolInvocations: message.toolInvocations,
                  };
                }),
              });

              // Save the token stats
              if (messages && newUserMessage && isValidTokenUsage(usage)) {
                const messageIds = newUserMessage
                  .concat(messages)
                  .map((message) => message.id);
                let { promptTokens, completionTokens, totalTokens } = usage;

                // Attach orchestrator usage
                if (isValidTokenUsage(orchestratorUsage)) {
                  promptTokens += orchestratorUsage.promptTokens;
                  completionTokens += orchestratorUsage.completionTokens;
                  totalTokens += orchestratorUsage.totalTokens;
                }

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
