import { revalidatePath } from 'next/cache';

import {
  CoreMessage,
  CoreTool,
  Message,
  NoSuchToolError,
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
      messages,
    }: { id: string; messages: Array<Message> } = await req.json();
    const coreMessages = convertToCoreMessages(messages);
    const userMessage: CoreMessage | undefined =
      getMostRecentUserMessage(coreMessages);

    const mostRecentToolResultMessage =
      getMostRecentToolResultMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const conversation = await dbGetConversation({ conversationId });

    if (!conversation) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations');
    }

    let toolUpdates: Array<ToolUpdate> = [];
    let newUserMessage: Awaited<ReturnType<typeof dbCreateMessages>> = null;

    const mostRecentConfirmationMessage =
      getMostRecentConfirmationMessage(coreMessages);

    if (mostRecentConfirmationMessage) {
      const result = getToolMessageResult(mostRecentConfirmationMessage);

      // If confirmation message has not been interacted with, update it based on next user message
      if (!result?.result) {
        const userMessage = getMostRecentUserMessage(coreMessages);
        if (userMessage) {
          const didUserConfirm =
            await convertUserResponseToBoolean(userMessage);

          const updatedMessage = updateConfirmationMessageResult(
            mostRecentConfirmationMessage,
            didUserConfirm,
          );

          await updateToolCallResults(conversationId, updatedMessage);

          const content = updatedMessage.content.at(0);
          if (content) {
            toolUpdates.push({
              type: 'tool-update',
              toolCallId: content.toolCallId,
              result: didUserConfirm ? 'confirm' : 'deny',
            });
          }
        }
      }
    }

    if (mostRecentToolResultMessage) {
      await updateToolCallResults(conversationId, mostRecentToolResultMessage);
    } else {
      newUserMessage = await dbCreateMessages({
        messages: [
          {
            conversationId,
            role: userMessage.role,
            content: JSON.parse(JSON.stringify(userMessage)),
          },
        ],
      });
    }

    // extract all attachments from the user message
    const attachments = messages
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
    const relevantMessages: CoreMessage[] = messages.slice(
      -MAX_TOKEN_MESSAGES,
    ) as CoreMessage[];

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
          async onFinish({ response, usage }) {
            if (!userId) return;

            try {
              const sanitizedResponses = sanitizeResponseMessages(
                response.messages,
              );

              // Create messages and get their IDs back
              const messages = await dbCreateMessages({
                messages: sanitizedResponses.map((message) => {
                  return {
                    conversationId,
                    role: message.role,
                    content: JSON.parse(JSON.stringify(message.content)),
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
