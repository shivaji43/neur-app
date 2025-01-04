import { z } from 'zod';

import { sendTelegramNotification } from '@/server/actions/telegram';

export const telegramTools = {
  sendNotification: {
    displayName: '📨 Send Telegram Notification',
    isCollapsible: true,
    description: 'Send a notification message to a Telegram user. Username and chat ID are optional as we may have saved them in the database',
    parameters: z.object({
      username: z
        .string()
        .optional()
        .describe('The Telegram username to send the message to. You can leave this empty if the user did not provide a username'),
      chatId: z
        .string()
        .optional()
        .describe('The Telegram chat ID to send the message to. You can leave this empty if the user did not provide a chat ID'),
      message: z.string().describe('The message to send'),
    }),
    execute: async ({
      username,
      chatId,
      message,
    }: {
      username?: string;
      chatId?: string;
      message: string;
    }) => {
      try {
        const response = await sendTelegramNotification({
          username,
          chatId,
          text: message,
        });
        if (!response || !response.data || !('success' in response.data && response.data.success === true)) {
          throw new Error(
            response?.data?.error || 'Failed to send notification',
          );
        }
        
        return {
          success: true,
          data: 'Notification sent successfully',
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to send notification',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: string;
        error?: string;
      };

      if (!typedResult.success) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error}
              </p>
            </div>
          </div>
        );
      }

      return <>{/* Render success message */}</>;
    },
  },
};
