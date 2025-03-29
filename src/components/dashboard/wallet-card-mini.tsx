'use client';

import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EAP_PRICE } from '@/lib/constants';
import { searchWalletAssets } from '@/lib/solana/helius';
import { EmbeddedWallet } from '@/types/db';
import { SOL_MINT } from '@/types/helius/portfolio';

interface WalletCardMiniProps {
  wallet: EmbeddedWallet;
  allWalletAddresses: string[];
  onUseWallet?: (wallet: EmbeddedWallet) => void;
  onFundWallet?: (wallet: EmbeddedWallet) => void;
}

export function WalletCardMini({
  wallet,
  onUseWallet,
  onFundWallet,
}: WalletCardMiniProps) {
  const { data: walletPortfolio, isLoading: isWalletPortfolioLoading } = useSWR(
    ['wallet-portfolio', wallet.publicKey],
    () => searchWalletAssets(wallet.publicKey),
    { refreshInterval: 30000 },
  );

  const solBalanceInfo = walletPortfolio?.fungibleTokens?.find(
    (t) => t.id === SOL_MINT,
  );

  const balance = solBalanceInfo
    ? solBalanceInfo.token_info.balance /
      10 ** solBalanceInfo.token_info.decimals
    : undefined;

  return (
    <div
      key={wallet.id}
      className="rounded-xl border border-border p-4 shadow-sm transition-colors duration-200 hover:bg-muted"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-base font-medium">{wallet.name}</p>
          <p className="truncate text-sm text-muted-foreground max-w-xs">
            {wallet.publicKey}
          </p>
        </div>
        <div className="text-right">
          {isWalletPortfolioLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <>
              {!isWalletPortfolioLoading && (
                <p
                  className={`text-xs ${
                    (balance ?? 0) < EAP_PRICE
                      ? 'text-red-500'
                      : 'text-green-600'
                  }`}
                >
                  {(balance ?? 0) < EAP_PRICE
                    ? 'Insufficient balance'
                    : 'Ready to use'}
                </p>
              )}
              <p className="text-sm font-semibold">{balance?.toFixed(4)} SOL</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        {(balance ?? 0) < EAP_PRICE && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFundWallet?.(wallet);
            }}
          >
            Fund Wallet
          </Button>
        )}
        <div
          title={
            (balance ?? 0) < EAP_PRICE
              ? `Minimum required: ${EAP_PRICE} SOL`
              : ''
          }
        >
          <Button
            size="sm"
            disabled={(balance ?? 0) < EAP_PRICE}
            onClick={(e) => {
              e.stopPropagation();
              onUseWallet?.(wallet);
            }}
          >
            Use Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}
