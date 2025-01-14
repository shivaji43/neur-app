'use server';

import { PublicKey } from '@solana/web3.js';
import { type CoreUserMessage, generateText } from 'ai';
import { BaseWallet, SolanaAgentKit, WalletAdapter } from 'solana-agent-kit';
import { z } from 'zod';

import { defaultModel } from '@/ai/providers';
import { RPC_URL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { ActionEmptyResponse, actionClient } from '@/lib/safe-action';
import { PrivyEmbeddedWallet } from '@/lib/solana/PrivyEmbeddedWallet';
import { decryptPrivateKey } from '@/lib/solana/wallet-generator';

import { getPrivyClient, verifyUser } from './user';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: CoreUserMessage;
}) {
  const { text: title } = await generateText({
    model: defaultModel,
    system: `\n
        - you will generate a short title based on the first message a user begins a conversation with
        - ensure it is not more than 80 characters long
        - the title should be a summary of the user's message
        - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

const renameSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
});

export const renameConversation = actionClient
  .schema(renameSchema)
  .action(
    async ({ parsedInput: { id, title } }): Promise<ActionEmptyResponse> => {
      try {
        await prisma.conversation.update({
          where: { id },
          data: { title },
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: 'UNEXPECTED_ERROR' };
      }
    },
  );

export const retrieveAgentKit = actionClient
  .schema(
    z
      .object({
        walletId: z.string(),
      })
      .optional(),
  )
  .action(async ({ parsedInput }) => {
    const authResult = await verifyUser();
    const userId = authResult?.data?.data?.id;

    if (!userId) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    const whereClause = parsedInput?.walletId
      ? { ownerId: userId, id: parsedInput.walletId }
      : { ownerId: userId, active: true };

    const wallet = await prisma.wallet.findFirst({
      where: whereClause,
    });

    if (!wallet) {
      return { success: false, error: 'WALLET_NOT_FOUND' };
    }

    console.log('[retrieveAgentKit] wallet', wallet.publicKey);

    let walletAdapter: WalletAdapter;
    if (wallet.encryptedPrivateKey) {
      walletAdapter = new BaseWallet(
        await decryptPrivateKey(wallet?.encryptedPrivateKey),
      );
    } else {
      const privyClientResponse = await getPrivyClient();
      const privyClient = privyClientResponse?.data;
      if (!privyClient) {
        return { success: false, error: 'PRIVY_CLIENT_NOT_FOUND' };
      }
      walletAdapter = new PrivyEmbeddedWallet(
        privyClient,
        new PublicKey(wallet.publicKey),
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY!;
    const agent = new SolanaAgentKit(walletAdapter, RPC_URL, {
      OPENAI_API_KEY: openaiKey,
    });

    return { success: true, data: { agent } };
  });
