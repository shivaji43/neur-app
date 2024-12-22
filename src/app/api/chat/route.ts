import { verifyUser } from '@/server/actions/user';
import { defaultModel } from '@/ai/model';
import { neurAgentTools } from '@/ai/tools';
import { convertToCoreMessages, CoreMessage, Message, streamText } from 'ai';
import { getMostRecentUserMessage, sanitizeResponseMessages } from '@/lib/utils/ai';
import { dbDeleteConversation, dbGetConversation, dbCreateConversation, dbCreateMessages } from '@/server/db/queries';
import { generateTitleFromUserMessage } from '@/server/actions/ai';
import { revalidatePath } from 'next/cache';

export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('[chat/route] Starting POST request');
  const session = await verifyUser();
  const userId = session?.data?.data?.id;

  if (!userId) {
    console.error('[chat/route] Unauthorized request');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id: conversationId, messages }: { id: string, messages: Array<Message> } = await req.json();
    const coreMessages = convertToCoreMessages(messages);
    const userMessage: CoreMessage | undefined = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      console.error('[chat/route] No user message found');
      return new Response('No user message found', { status: 400 });
    }

    console.log('[chat/route] Processing conversation:', { conversationId, messageCount: messages.length });

    const conversation = await dbGetConversation({ conversationId });

    if (!conversation) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await dbCreateConversation({ conversationId, userId, title });
      revalidatePath('/api/conversations')
    }

    await dbCreateMessages({
      messages: [
        {
          conversationId,
          role: userMessage.role,
          content: JSON.parse(JSON.stringify(userMessage))
        },
      ],
    });

    const result = streamText({
      model: defaultModel,
      system: `
      You are a helpful assistant.
      Answer the question based on the context provided.
      Leverage the tools provided smartly.
      Be nice and slightly humorous. Make your answer concise and to the point.

      ---
      Famous people on Solana and their twitter handles:
      - toly: @aeyakovenko
      ---
      `,
      messages,
      tools: neurAgentTools,
      experimental_toolCallStreaming: true,
      maxSteps: 15,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text',
      },
      async onFinish({ response }) {
        if (!userId) return;

        try {
          console.log('[chat/route] Saving response messages');
          const responseMessagesWithoutIncompleteToolCalls = sanitizeResponseMessages(response.messages);
          await dbCreateMessages({
            messages: responseMessagesWithoutIncompleteToolCalls.map(
              (message) => {
                return {
                  conversationId,
                  role: message.role,
                  content: JSON.parse(JSON.stringify(message.content))
                };
              },
            ),
          });

          revalidatePath('/api/conversations');
        } catch (error) {
          console.error("[chat/route] Failed to save messages", error);
          // Even if saving messages fails, we don't want to break the stream
          // The messages will still be shown to the user in the UI
        }
      }
    });

    console.log('[chat/route] Streaming response');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[chat/route] Unexpected error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  try {
    const { id: conversationId } = await req.json();
    await dbDeleteConversation({ conversationId, userId });
    revalidatePath('/api/conversations')

    return new Response('Conversation deleted', { status: 200 });
  } catch (error) {
    console.error('[chat/route] Delete error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}