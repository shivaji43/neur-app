import { useEffect, useState } from 'react';

import Image from 'next/image';

import { WalletWithMetadata } from '@privy-io/react-auth';
import { useFundWallet } from '@privy-io/react-auth/solana';

import { WalletCardEap } from '@/components/dashboard/wallet-card-eap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/hooks/use-user';
import { useEmbeddedWallets } from '@/hooks/use-wallets';
import { solanaCluster } from '@/lib/constants';
import { PHANTOM_WALLET_SELECT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { EmbeddedWallet } from '@/types/db';

interface SelectFundingWalletProps {
  displayPrompt: boolean;
  isProcessing: boolean;
  embeddedWallets: EmbeddedWallet[];
  onSelectWallet: (wallet: EmbeddedWallet | 'phantom') => void;
  onCancel: () => void;
}

export function SelectFundingWalletDialog({
  displayPrompt,
  isProcessing,
  onCancel,
  onSelectWallet,
}: SelectFundingWalletProps) {
  const [isPhantomProcessing, setIsPhantomProcessing] = useState(false);
  useEffect(() => {
    if (isPhantomProcessing && !isProcessing) {
      setIsPhantomProcessing(false);
    }
  }, [setIsPhantomProcessing, isProcessing]);

  const {
    data: embeddedWallets = [],
    error: walletsError,
    isLoading: isWalletsLoading,
    mutate: mutateWallets,
  } = useEmbeddedWallets();

  // const privyWallets = embeddedWallets.filter(
  //   (w: EmbeddedWallet) => w.walletSource === 'PRIVY' && w.chain === 'SOLANA',
  // );
  const { user } = useUser();
  const privyUser = user?.privyUser;
  const allUserLinkedAccounts = privyUser ? privyUser.linkedAccounts : [];
  const linkedSolanaWallet = allUserLinkedAccounts.find(
    (acct): acct is WalletWithMetadata =>
      acct.type === 'wallet' &&
      acct.walletClientType !== 'privy' &&
      acct.chainType === 'solana',
  );

  const linkedSolanaWalletEmbeddedWallet: EmbeddedWallet | undefined =
    linkedSolanaWallet
      ? {
          id: linkedSolanaWallet.address,
          name: 'Privy Linked Wallet',
          publicKey: linkedSolanaWallet.address || '',
          walletSource: 'PRIVY',
          chain: 'SOLANA',
          delegated: linkedSolanaWallet.delegated,
          ownerId: user ? user.id : '',
          active: false,
          encryptedPrivateKey: null,
        }
      : undefined;

  const legacyWallets = embeddedWallets.filter(
    (w: EmbeddedWallet) => w.walletSource === 'CUSTOM' && w.chain === 'SOLANA',
  );

  const allWalletAddresses = [
    ...(linkedSolanaWallet ? [linkedSolanaWallet.address] : []),
    ...legacyWallets.map((w) => w.publicKey),
  ];

  const { fundWallet } = useFundWallet();

  return (
    <Dialog onOpenChange={onCancel} open={displayPrompt}>
      <DialogContent className="w-full rounded-2xl p-4 shadow-xl sm:max-w-[650px] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold sm:text-xl">
            Select Funding Wallet
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose how you want to fund this transaction
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Phantom Wallet Option */}
          <div
            className={cn(
              'relative cursor-pointer rounded-lg border border-border p-4 shadow-sm transition-colors sm:rounded-xl',
              isProcessing
                ? 'pointer-events-none opacity-50'
                : 'hover:bg-muted',
            )}
            onClick={() => {
              if (!isProcessing) {
                setIsPhantomProcessing(true);
                onSelectWallet(PHANTOM_WALLET_SELECT);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <Image
                src="/icons/phantom-icon.png"
                alt="Phantom"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium sm:text-base">
                  {isPhantomProcessing
                    ? 'Processing Payment'
                    : 'Pay with Phantom'}
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {isPhantomProcessing
                    ? 'Hold on while we confirm your payment...'
                    : 'Connect and pay using your Phantom wallet'}
                </p>
              </div>
            </div>
          </div>

          {linkedSolanaWalletEmbeddedWallet && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Linked Solana Wallets
              </h3>
              <div className="space-y-2">
                <WalletCardEap
                  key={linkedSolanaWalletEmbeddedWallet.id}
                  wallet={linkedSolanaWalletEmbeddedWallet}
                  mutateWallets={mutateWallets}
                  isProcessing={isProcessing}
                  allWalletAddresses={allWalletAddresses}
                  onPayEap={() =>
                    onSelectWallet(linkedSolanaWalletEmbeddedWallet)
                  }
                  onFundWallet={async (wallet: EmbeddedWallet) =>
                    await fundWallet(wallet.publicKey, {
                      cluster: solanaCluster,
                    })
                  }
                />
              </div>
            </div>
          )}

          {legacyWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Legacy Embedded Wallets
              </h3>
              <div className="space-y-2">
                {legacyWallets.map((wallet) => (
                  <WalletCardEap
                    key={wallet.id}
                    wallet={wallet}
                    mutateWallets={mutateWallets}
                    isProcessing={isProcessing}
                    allWalletAddresses={allWalletAddresses}
                    onPayEap={() => onSelectWallet(wallet)}
                    onFundWallet={async (wallet: EmbeddedWallet) =>
                      await fundWallet(wallet.publicKey, {
                        cluster: solanaCluster,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
