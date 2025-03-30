'use client';

import { useState } from 'react';
import { Banknote, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableText } from '@/components/ui/copyable-text';
import { Label } from '@/components/ui/label';
import { EAP_PRICE } from '@/lib/constants';
import { searchWalletAssets } from '@/lib/solana/helius';
import { EmbeddedWallet } from '@/types/db';
import { SOL_MINT } from '@/types/helius/portfolio';

interface WalletCardMiniProps {
  wallet: EmbeddedWallet;
  allWalletAddresses: string[];
  mutateWallets: () => Promise<EmbeddedWallet[] | undefined>;
  useWallet: (wallet: EmbeddedWallet) => void;
  onFundWallet: (wallet: EmbeddedWallet) => Promise<void>;
}

export function WalletCardMini({
  wallet,
  mutateWallets,
  useWallet,
  onFundWallet,
}: WalletCardMiniProps) {
  const {
    data: walletPortfolio,
    isLoading: isWalletPortfolioLoading,
    mutate: mutateWalletPortfolio,
  } = useSWR(
    ['wallet-portfolio', wallet.publicKey],
    () => searchWalletAssets(wallet.publicKey),
    { refreshInterval: 30000 },
  );
  const [isLoading, setIsLoading] = useState(false);
  async function refreshWalletData() {
    await mutateWallets();
    await mutateWalletPortfolio();
  }

  const solBalanceInfo = walletPortfolio?.fungibleTokens?.find(
    (t) => t.id === SOL_MINT,
  );

  const balance = solBalanceInfo
    ? solBalanceInfo.token_info.balance /
      10 ** solBalanceInfo.token_info.decimals
    : undefined;

  async function handleFundWallet() {
    try {
      setIsLoading(true);
      // await fundWallet(wallet.publicKey, { cluster: solanaCluster });
      await onFundWallet(wallet);
      toast.success('Wallet funded');
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to fund wallet');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      key={wallet.id}
      className="rounded-xl border border-border p-4 shadow-sm transition-colors duration-200 hover:bg-muted"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-base font-medium">{wallet.name}</p>
          <div className="max-w-xs truncate text-sm text-muted-foreground">
            <Label className="text-xs font-normal text-muted-foreground">
              Public Key
            </Label>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <CopyableText text={wallet?.publicKey || ''} showSolscan />
            </div>
          </div>
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
            className="w-full sm:w-auto"
            onClick={handleFundWallet}
            disabled={isLoading}
          >
            <Banknote className="h-4 w-4" />
            Fund
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
            className="w-full sm:w-auto"
            disabled={(balance ?? 0) < EAP_PRICE || isLoading}
            onClick={(e) => {
              e.stopPropagation();
              useWallet(wallet);
            }}
          >
            <DollarSign className="h-4 w-4" />
            Pay
          </Button>
        </div>
      </div>
    </div>
  );
}
