import { z } from 'zod';

import { ActionResponse, actionClient } from '@/lib/safe-action';
import {
  dbGetUserTelegramId,
  dbUpdateUserTelegramId,
} from '@/server/db/queries';

import { verifyUser } from './user';

export const MISSING_USERNAME_ERROR = 'No saved Telegram username found';
export const BOT_NOT_STARTED_ERROR = 'Bot not started yet';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;
const TELEGRAM_GET_BOT_INFO_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
const TELEGRAM_SEND_MESSAGE_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const TELEGRAM_GET_UPDATES_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;

interface SendTelegramNotificationData {
  success: boolean;
  error?: string;
  botId?: string;
}

const getBotUsername = async (): Promise<string> => {
  const response = await fetch(TELEGRAM_GET_BOT_INFO_API_URL);
  if (!response.ok) throw new Error('Failed to get bot info from Telegram API');
  const data = await response.json();
  return data.result.username;
};

const getChatIdByUsername = async (
  username: string,
): Promise<string | null> => {
  const response = await fetch(TELEGRAM_GET_UPDATES_API_URL);
  if (!response.ok) throw new Error('Failed to get updates from Telegram API');
  const data = await response.json();
  const chat = data.result.find(
    (msg: any) => msg.message.from?.username === username,
  );
  return chat ? chat.message.chat.id : null;
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error('Failed to send message to Telegram API');
};

export const sendTelegramNotification = actionClient
  .schema(
    z.object({
      username: z.string().optional(),
      chatId: z.string().optional(),
      text: z.string(),
    }),
  )
  .action<ActionResponse<SendTelegramNotificationData>>(
    async ({ parsedInput: { username, text } }) => {
      if (!TELEGRAM_BOT_TOKEN) {
        return {
          success: false,
          error: 'Telegram bot token not set',
          data: { success: false },
        };
      }

      const authResult = await verifyUser();
      const userId = authResult?.data?.data?.id;
      if (!userId) {
        return {
          success: false,
          error: 'UNAUTHORIZED',
          data: { success: false },
        };
      }

      const botId = TELEGRAM_BOT_USERNAME ?? (await getBotUsername());

      try {
        const dbUsername = await dbGetUserTelegramId({ userId });
        const finalUsername = username || dbUsername;
        if (!finalUsername) {
          return {
            success: false,
            error: MISSING_USERNAME_ERROR,
            data: { success: false },
          };
        }

        const sanitizedUsername = finalUsername.replaceAll('@', '');
        const foundChatId = await getChatIdByUsername(sanitizedUsername);
        if (!foundChatId) {
          return {
            success: false,
            error: BOT_NOT_STARTED_ERROR,
            data: { success: false, error: BOT_NOT_STARTED_ERROR, botId },
          };
        }

        if (!dbUsername || dbUsername !== sanitizedUsername) {
          await dbUpdateUserTelegramId({
            userId,
            telegramId: sanitizedUsername,
          });
        }
        await sendTelegramMessage({ chatId: foundChatId, text });

        return { success: true, data: { success: true } };
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to send telegram notification';
        return {
          success: false,
          error: msg,
          data: { success: false, error: msg },
        };
      }
    },
  );

interface TelegramUsernameCheckData {
  success: boolean;
  error?: string;
  username?: string;
}

export const checkTelegramUsername =
  async (): Promise<TelegramUsernameCheckData> => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;
    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const username = await dbGetUserTelegramId({ userId });
    if (!username) {
      return { success: false, error: MISSING_USERNAME_ERROR };
    }

    return { success: true, username };
  };
