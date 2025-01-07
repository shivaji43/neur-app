import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Card } from '@/components/ui/card';
import {
  BOT_NOT_STARTED_ERROR,
  MISSING_USERNAME_ERROR,
  checkTelegramUsername,
  sendTelegramNotification,
} from '@/server/actions/telegram';

interface TelegramResult {
  success: boolean;
  data?: string;
  error?: string;
  botId?: string;
  noFollowUp?: boolean;
}

export const telegramTools = {
  sendTelegramNotification: {
    displayName: '📨 Send Telegram Notification',
    isCollapsible: true,
    isExpandedByDefault: true,
    description:
      'Send a notification message to a Telegram user. Username is optional if saved in the database.',
    parameters: z.object({
      username: z.string().optional(),
      message: z.string(),
    }),
    execute: async ({
      username,
      message,
    }: {
      username?: string;
      message: string;
    }): Promise<TelegramResult> => {
      try {
        const usernameCheck = await checkTelegramUsername();

        if (!username && !usernameCheck.username) {
          return { success: false, error: MISSING_USERNAME_ERROR };
        }

        const finalUsername = username || usernameCheck.username;
        const response = await sendTelegramNotification({
          username: finalUsername,
          text: message,
        });

        if (!response?.data?.data) {
          return { success: false, error: 'No response from Telegram action' };
        }

        const { success, error, botId } = response.data.data;
        if (!success) {
          return { success, error, botId };
        }

        return {
          success: true,
          data: 'Notification sent successfully',
          noFollowUp: true,
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
      const typedResult = result as TelegramResult;

      if (
        !typedResult.success &&
        typedResult.error === MISSING_USERNAME_ERROR
      ) {
        return (
          <Card className="bg-card p-6">
            <h2 className="mb-3 text-xl font-semibold text-card-foreground">
              Missing Telegram Username
            </h2>
            <p className="text-sm text-muted-foreground">
              Please provide a Telegram username so we can send notifications.
            </p>
          </Card>
        );
      }

      if (!typedResult.success && typedResult.error === BOT_NOT_STARTED_ERROR) {
        const { botId } = typedResult;
        return (
          <Card className="bg-card p-6">
            <h2 className="mb-3 text-xl font-semibold text-card-foreground">
              Bot Not Started
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You need to start the bot before sending Telegram notifications.
              </p>
              <p className="flex items-center gap-1">
                <span>Click here to start:</span>
                <a
                  href={`https://t.me/${botId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md font-medium underline hover:text-primary"
                >
                  @{botId}
                  <ExternalLink className="ml-1 inline-block h-3 w-3" />
                </a>
              </p>
            </div>
          </Card>
        );
      }

      if (!typedResult.success) {
        return (
          <Card className="bg-card p-6">
            <h2 className="mb-3 text-xl font-semibold text-destructive">
              Error
            </h2>
            <p className="text-sm text-muted-foreground">{typedResult.error}</p>
          </Card>
        );
      }

      return (
        <Card className="bg-card p-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            Telegram Notification Sent ✅
          </h2>
        </Card>
      );
    },
  },
};
