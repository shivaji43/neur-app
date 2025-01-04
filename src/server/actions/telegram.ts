import { z } from 'zod';

import { ActionResponse, actionClient } from '@/lib/safe-action';

import { dbGetUserTelegramId, dbUpdateUserTelegramId } from '../db/queries';
import { verifyUser } from './user';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_GET_BOT_INFO_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
const TELEGRAM_SEND_MESSAGE_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const TELEGRAM_GET_UPDATES_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;

const getBotUsername = async (): Promise<string> => {
  const response = await fetch(TELEGRAM_GET_BOT_INFO_API_URL);

  if (!response.ok) {
    throw new Error('Failed to get bot info from Telegram API');
  }

  const data = await response.json();

  return data.result.username;
}

const getChatIdByUsername = async (
  username: string,
): Promise<string | null> => {
  const response = await fetch(TELEGRAM_GET_UPDATES_API_URL);

  if (!response.ok) {
    throw new Error('Failed to get updates from Telegram API');
  }

  const data = await response.json();
  const messages = data.result;

  const chat = messages.find(
    (message: any) => message.message.from.username === username,
  );

  if (!chat) {
    return null;
  }

  return chat.message.chat.id;
};

const sendTelegramMessage = async ({
  chatId,
  text,
}: {
  chatId: string;
  text: string;
}) => {
  const response = await fetch(TELEGRAM_SEND_MESSAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message to Telegram API');
  }
};

export const sendTelegramNotification = actionClient
  .schema(
    z.object({
      username: z.string().optional(),
      chatId: z.string().optional(),
      text: z.string(),
    }),
  )
  .action<ActionResponse<void>>(
    async ({ parsedInput: { username, chatId, text } }) => {
      if (!TELEGRAM_BOT_TOKEN) {
        return {
          success: false,
          error: 'Telegram bot token not set',
        };
      }

      try {
        if (chatId) {
          await sendTelegramMessage({ chatId, text });
        } else if (username) {
          const chatId = await getChatIdByUsername(username);

          if (!chatId) {
            return {
              success: false,
              error: `Start the bot first https://t.me/${await getBotUsername()}`,
            };
          }

          await sendTelegramMessage({ chatId, text });

          // if the username not in db, update it
          const authResult = await verifyUser();
          const userId = authResult?.data?.data?.id;

          if (!userId) {
            return { success: false, error: 'UNAUTHORIZED' };
          }

          const userTelegramUsername = await dbGetUserTelegramId({ userId });

          if (!userTelegramUsername || userTelegramUsername !== username) {
            await dbUpdateUserTelegramId({ userId, telegramId: username });
          }
        } else {
          // if user just said to notify them
          const authResult = await verifyUser();
          const userId = authResult?.data?.data?.id;

          if (!userId) {
            return { success: false, error: 'UNAUTHORIZED' };
          }

          const userTelegramUsername = await dbGetUserTelegramId({ userId });

          if (!userTelegramUsername) {
            return {
              success: false,
              error: 'Can you tell me your Telegram username?',
            };
          }

          const chatId = await getChatIdByUsername(userTelegramUsername);

          if (!chatId) {
            return {
              success: false,
              error: `Start the bot first https://t.me/${await getBotUsername()}`,
            };
          }

          await sendTelegramMessage({ chatId, text });
        }

        return {
          success: true,
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send telegram notification',
        };
      }
    },
  );
