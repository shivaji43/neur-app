'use client';

import useSWR from 'swr';

import { searchWalletAssets } from '@/lib/solana/helius';
import { syncEmbeddedWallets } from '@/server/actions/user';
import { EmbeddedWallet } from '@/types/db';
import { SOL_MINT } from '@/types/helius/portfolio';

export function useEmbeddedWallets() {
  return useSWR('embeddedWallets', async () => {
    // Call the action once, get back both user + wallets
    const result = await syncEmbeddedWallets();
    if (!result?.data?.success) {
      throw new Error(result?.data?.error ?? 'Failed to sync wallets');
    }
    // Return just the wallets array for convenience
    return result?.data?.data?.wallets;
  });
}

export async function getTotalWalletBalance(embeddedWallets: EmbeddedWallet[]): Promise<number> {
  const balances = await Promise.all(
    embeddedWallets.map(async (wallet) => {
      try {
        const walletPortfolio = await searchWalletAssets(wallet.publicKey);

        const solBalanceInfo = walletPortfolio?.fungibleTokens?.find(
          (t) => t.id === SOL_MINT,
        );

        const balance = solBalanceInfo
          ? solBalanceInfo.token_info.balance /
            10 ** solBalanceInfo.token_info.decimals
          : 0;

        return balance; // return a number
      } catch (error) {
        return 0;
      }
    }),
  );
  const total = balances.reduce((sum, cur) => sum + cur, 0);
  return total;
}
