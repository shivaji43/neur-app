import { Action, Prisma, Message as PrismaMessage } from '@prisma/client';
import { CoreToolMessage } from 'ai';
import _ from 'lodash';

import prisma from '@/lib/prisma';
import { NewAction } from '@/types/db';

/**
 * Retrieves a conversation by its ID
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The unique identifier of the conversation
 * @returns {Promise<Conversation | null>} The conversation object or null if not found/error occurs
 */
export async function dbGetConversation({
  conversationId,
  includeMessages,
}: {
  conversationId: string;
  includeMessages?: boolean;
}) {
  try {
    return await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: includeMessages ? { messages: true } : undefined,
    });
  } catch (error) {
    console.error('[DB Error] Failed to get conversation:', {
      conversationId,
      error,
    });
    return null;
  }
}

/**
 * Creates a new conversation
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The unique identifier for the new conversation
 * @param {string} params.userId - The user who owns the conversation
 * @param {string} params.title - The title of the conversation
 * @returns {Promise<Conversation | null>} The created conversation or null if creation fails
 */
export async function dbCreateConversation({
  conversationId,
  userId,
  title,
}: {
  conversationId: string;
  userId: string;
  title: string;
}) {
  try {
    return await prisma.conversation.create({
      data: { id: conversationId, userId, title },
    });
  } catch (error) {
    console.error('[DB Error] Failed to create conversation:', {
      conversationId,
      userId,
      error,
    });
    return null;
  }
}

/**
 * Creates multiple messages in bulk
 * @param {Object} params - The parameters object
 * @param {Array<Omit<PrismaMessage, 'id' | 'createdAt'>>} params.messages - Array of message objects to create
 * @returns {Promise<Prisma.BatchPayload | null>} The result of the bulk creation or null if it fails
 */
export async function dbCreateMessages({
  messages,
}: {
  messages: Omit<PrismaMessage, 'id' | 'createdAt'>[];
}) {
  try {
    return await prisma.message.createManyAndReturn({
      data: messages as Prisma.MessageCreateManyInput[],
    });
  } catch (error) {
    console.error('[DB Error] Failed to create messages:', {
      messageCount: messages.length,
      error,
    });
    return null;
  }
}

/**
 * Updates the tool-call results for any toolCallIds
 * in the provided `messageData.content` array.
 *
 * @param conversationId - The ID of the conversation
 * @param messageData    - An object with role: "tool" and an array of tool-result items
 * @returns An array of updated Messages or an empty array if no matches
 */
export async function updateToolCallResults(
  conversationId: string,
  messageData: CoreToolMessage,
): Promise<PrismaMessage[]> {
  const updatedMessages: PrismaMessage[] = [];

  for (const item of messageData.content) {
    const toolCallId = item.toolCallId;
    const newResultObj = item.result;
    const toolMessages = await prisma.message.findMany({
      where: {
        conversationId,
        role: 'tool',
      },
    });

    let messageToUpdate: PrismaMessage | null = null;
    for (const msg of toolMessages) {
      const contentArray = msg.content as any[];
      const hasMatchingToolCallId = contentArray.some(
        (c) => c.toolCallId === toolCallId,
      );
      if (hasMatchingToolCallId) {
        messageToUpdate = msg;
        break;
      }
    }

    if (!messageToUpdate) {
      continue;
    }

    const oldContentArray = messageToUpdate.content as any[];
    const newContentArray = oldContentArray.map((c) => {
      if (c.toolCallId === toolCallId) {
        return {
          ...c,
          result: newResultObj,
        };
      }
      return c;
    });

    const updatedMessage = await prisma.message.update({
      where: { id: messageToUpdate.id },
      data: { content: newContentArray },
    });

    updatedMessages.push(updatedMessage);
  }

  return updatedMessages;
}

/**
 * Retrieves all messages for a specific conversation
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The conversation ID to fetch messages for
 * @returns {Promise<Message[] | null>} Array of messages or null if query fails
 */
export async function dbGetConversationMessages({
  conversationId,
}: {
  conversationId: string;
}) {
  try {
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get conversation messages:', {
      conversationId,
      error,
    });
    return null;
  }
}

/**
 * Deletes a conversation and all its associated messages
 * @param {Object} params - The parameters object
 * @param {string} params.conversationId - The ID of the conversation to delete
 * @param {string} params.userId - The user ID who owns the conversation
 * @returns {Promise<void>}
 */
export async function dbDeleteConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  try {
    await prisma.$transaction([
      prisma.action.deleteMany({
        where: { conversationId },
      }),
      prisma.message.deleteMany({
        where: { conversationId },
      }),
      prisma.conversation.delete({
        where: {
          id: conversationId,
          userId,
        },
      }),
    ]);
  } catch (error) {
    console.error('[DB Error] Failed to delete conversation:', {
      conversationId,
      userId,
      error,
    });
    throw error;
  }
}

/**
 * Retrieves all conversations for a specific user
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user
 * @returns {Promise<Conversation[]>} Array of conversations
 */
export async function dbGetConversations({ userId }: { userId: string }) {
  try {
    return await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get user conversations:', {
      userId,
      error,
    });
    return [];
  }
}

/**
 * Retrieves all actions that match the specified filters
 * @param {Object} params - The parameters object
 * @param {boolean} params.triggered - Boolean to filter triggered actions
 * @param {boolean} params.paused - Boolean to filter paused actions
 * @param {boolean} params.completed - Boolean to filter completed actions
 * @param {number} params.frequency - The frequency of the action
 * @returns {Promise<Action[]>} Array of actions
 */
export async function dbGetActions({
  triggered,
  paused,
  completed,
}: {
  triggered: boolean;
  paused: boolean;
  completed: boolean;
}) {
  try {
    return await prisma.action.findMany({
      where: {
        triggered,
        paused,
        completed,
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { include: { wallets: true } } },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get actions:', {
      error,
    });
    return [];
  }
}

export async function dbCreateAction(action: NewAction) {
  try {
    return await prisma.action.create({
      data: {
        ..._.omit(action, 'conversationId', 'userId'),
        params: action.params as Prisma.JsonObject,
        user: {
          connect: {
            id: action.userId,
          },
        },
        conversation: {
          connect: {
            id: action.conversationId,
          },
        },
      },
    });
  } catch (error) {
    console.error('[DB Error] Failed to create action:', {
      error,
    });
    return undefined;
  }
}

export async function dbCreateTokenStat({
  userId,
  messageIds,
  totalTokens,
  promptTokens,
  completionTokens,
}: {
  userId: string;
  messageIds: string[];
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
}) {
  try {
    return await prisma.tokenStat.create({
      data: {
        userId,
        messageIds,
        totalTokens,
        promptTokens,
        completionTokens,
      },
    });
  } catch (error) {
    console.error('[DB Error] Failed to create token stats:', {
      error,
    });
    return null;
  }
}

/**
 * Retrieves the Telegram ID for a user
 */
export async function dbGetUserTelegramChat({ userId }: { userId: string }) {
  try {
    return await prisma.telegramChat.findUnique({
      where: { userId },
      select: { username: true, chatId: true },
    });
  } catch (error) {
    console.error('[DB Error] Failed to get user Telegram Chat:', {
      userId,
      error,
    });
    return null;
  }
}

/**
 * Updates the Telegram Chat for a user
 */
export async function dbUpdateUserTelegramChat({
  userId,
  username,
  chatId,
}: {
  userId: string;
  username: string;
  chatId?: string;
}) {
  try {
    return await prisma.telegramChat.upsert({
      where: { userId },
      update: { username, chatId },
      create: { userId, username, chatId },
    });
  } catch (error) {
    console.error('[DB Error] Failed to update user Telegram Chat:', {
      userId,
      username,
      error: `${error}`,
    });
    return null;
  }
}

export async function dbGetUserActions({ userId }: { userId: string }) {
  try {
    const actions = await prisma.action.findMany({
      where: {
        userId,
        completed: false,
      },
      orderBy: { createdAt: 'desc' },
    });
    return actions;
  } catch (error) {
    console.error('[DB Error] Failed to get user actions:', {
      userId,
      error,
    });
    return [];
  }
}

export async function dbDeleteAction({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  try {
    return await prisma.action.delete({
      where: {
        id,
        userId, // Ensure user owns the action
      },
    });
  } catch (error) {
    console.error('[DB Error] Failed to delete action:', { id, userId, error });
    throw error;
  }
}

export async function dbUpdateAction({
  id,
  userId,
  data,
}: {
  id: string;
  userId: string;
  data: Partial<Action>;
}) {
  try {
    // Validate and clean the data before update
    const validData = {
      description: data.description,
      frequency: data.frequency === 0 ? null : data.frequency,
      maxExecutions: data.maxExecutions === 0 ? null : data.maxExecutions,
      // Only include fields we want to update
    } as const;

    return await prisma.action.update({
      where: {
        id,
        userId,
      },
      data: validData,
    });
  } catch (error) {
    console.error('[DB Error] Failed to update action:', { id, userId, error });
    return null;
  }
}
