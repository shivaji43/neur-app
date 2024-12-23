import { verifyUser } from '@/server/actions/user';
import { defaultModel, defaultSystemPrompt, defaultTools } from '@/ai/providers';
import { convertToCoreMessages, CoreMessage, Message, streamText } from 'ai';
import { getMostRecentUserMessage, sanitizeResponseMessages } from '@/lib/utils/ai';
import { dbDeleteConversation, dbGetConversation, dbCreateConversation, dbCreateMessages } from '@/server/db/queries';
import { generateTitleFromUserMessage } from '@/server/actions/ai';
import { revalidatePath } from 'next/cache';

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await verifyUser();
  const userId = session?.data?.data?.id;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { id: conversationId, messages }: { id: string, messages: Array<Message> } = await req.json();
    const coreMessages = convertToCoreMessages(messages);
    const userMessage: CoreMessage | undefined = getMostRecentUserMessage(coreMessages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

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
      system: defaultSystemPrompt,
      tools: defaultTools,
      experimental_toolCallStreaming: true,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text',
      },
      maxSteps: 15,
      messages,
      async onFinish({ response }) {
        if (!userId) return;

        try {
          const sanitizedResponses = sanitizeResponseMessages(response.messages);
          await dbCreateMessages({
            messages: sanitizedResponses.map(
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
        }
      }
    });

    return result.toDataStreamResponse();
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
    revalidatePath('/api/conversations')

    return new Response('Conversation deleted', { status: 200 });
  } catch (error) {
    console.error('[chat/route] Delete error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}