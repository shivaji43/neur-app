import { Message as PrismaMessage } from '@prisma/client';
import {
  Attachment,
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from 'ai';

export function getUnconfirmedConfirmationMessage(
  messages: Array<Message>,
): Message | undefined {
  const unconfirmedConfirmationMessage = messages.find(
    (msg) =>
      msg.role === 'assistant' &&
      msg.toolInvocations?.find(
        (tool) =>
          tool.toolName === 'askForConfirmation' &&
          tool.state === 'result' &&
          tool.result.result === undefined &&
          tool.result.message !== undefined,
      ),
  );

  return unconfirmedConfirmationMessage;
}

type ToolMessageResult = {
  result?: string;
  message: string;
};

/**
 * Updates the content result of a confirmation tool message based on isConfirmed
 * @param confirmationMessage - Confirmation message to update
 * @param isConfirmed
 * @returns  The original message if an update cannot be made, otherwise the updated message
 */
export function updateConfirmationMessageResult(
  confirmationMessage: CoreToolMessage,
  isConfirmed: boolean,
) {
  const messageResult = getToolMessageResult(confirmationMessage);
  if (!messageResult) {
    return confirmationMessage;
  }

  messageResult.result = isConfirmed ? 'confirm' : 'deny';

  return confirmationMessage;
}

/**
 * Retrieves the result from the content of a tool message
 * @param message - Core tool message to parse
 * @returns  The result from the content of the tool message
 */
export function getToolMessageResult(
  message: CoreToolMessage,
): ToolMessageResult | undefined {
  const content = message.content?.at(0);

  return content && content.result
    ? (content.result as ToolMessageResult)
    : undefined;
}

/**
 * Retrieves the most recent user message from an array of messages.
 * @param messages - Array of core messages to search through
 * @returns The last user message in the array, or undefined if none exists
 */
export function getMostRecentUserMessage(messages: Array<CoreMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

/**
 *
 * @param messages
 * @returns  Most recent tool result message or undefined if none found
 */
export function getMostRecentToolResultMessage(
  messages: Array<CoreMessage>,
): CoreToolMessage | undefined {
  const mostRecentMessage = messages.at(-1);
  if (
    mostRecentMessage &&
    mostRecentMessage.role === 'tool' &&
    mostRecentMessage.content &&
    mostRecentMessage.content.length > 0 &&
    mostRecentMessage.content[0].result
  ) {
    return mostRecentMessage;
  }
  return undefined;
}

/**
 * Sanitizes response messages by removing incomplete tool calls and empty content.
 * This function processes both tool messages and assistant messages to ensure
 * all tool calls have corresponding results and all content is valid.
 *
 * @param messages - Array of tool or assistant messages to sanitize
 * @returns Array of sanitized messages with valid content only
 */
export function sanitizeResponseMessages(
  messages: Array<CoreToolMessage | CoreAssistantMessage>,
) {
  // Track all tool results for validation
  const toolResultIds: Array<string> = [];

  // Collect all tool result IDs
  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  // Sanitize message content
  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;
    if (typeof message.content === 'string') return message;

    // Filter out invalid content
    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  // Remove messages with empty content
  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}
