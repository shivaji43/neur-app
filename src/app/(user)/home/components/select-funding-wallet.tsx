import { useEffect, useState } from 'react';

import Image from 'next/image';

import {
  ConnectedSolanaWallet,
  WalletWithMetadata,
  useConnectWallet,
} from '@privy-io/react-auth';
import { useFundWallet, useSolanaWallets } from '@privy-io/react-auth/solana';
import { Wallet } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { EmbeddedWallet } from '@/types/db';

interface SelectFundingWalletProps {
  displayPrompt: boolean;
  isProcessing: boolean;
  embeddedWallets: EmbeddedWallet[];
  onConnectExternalWallet: () => void;
  onSelectWallet: (wallet: EmbeddedWallet | 'phantom') => void;
  onCancel: () => void;
}

export function SelectFundingWalletDialog({
  displayPrompt,
  isProcessing,
  onCancel,
  onConnectExternalWallet,
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

  const { user } = useUser();
  const { wallets } = useSolanaWallets();
  const privyUser = user?.privyUser;
  const allUserLinkedAccounts = privyUser ? privyUser.linkedAccounts : [];
  const linkedSolanaWallet = allUserLinkedAccounts.find(
    (acct): acct is WalletWithMetadata =>
      acct.type === 'wallet' &&
      acct.walletClientType !== 'privy' &&
      acct.chainType === 'solana',
  );

  const legacyWallets = embeddedWallets.filter(
    (w: EmbeddedWallet) => w.walletSource === 'CUSTOM' && w.chain === 'SOLANA',
  );

  const convertSolanaConnectedWalletToEmbeddedWallet = (
    wallet: ConnectedSolanaWallet,
  ): EmbeddedWallet => ({
    id: wallet.address,
    name: wallet.meta.name,
    publicKey: wallet.address,
    walletSource: 'CUSTOM',
    chain: 'SOLANA',
    delegated: false,
    ownerId: user ? user.id : '',
    active: false,
    encryptedPrivateKey: null,
  });

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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Connected Solana Wallets
          </h3>

          <div
            className={cn(
              'relative cursor-pointer rounded-lg border border-border p-4 shadow-sm transition-colors sm:rounded-xl',
              isProcessing
                ? 'pointer-events-none opacity-50'
                : 'hover:bg-muted',
            )}
            onClick={onConnectExternalWallet}
          >
            <div className="flex items-center gap-4">
              <Wallet className="h-6 w-6" />
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium sm:text-base">
                  { wallets.length === 0 ? "Connect a Solana Wallet" : "Connect Another Solana Wallet" }
                </h3>
              </div>
            </div>
          </div>

          {wallets.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                {wallets.map((wallet) => (
                  <WalletCardEap
                    key={wallet.address}
                    isEmbeddedWallet={wallet.walletClientType === 'privy'}
                    onDisconnectWallet={() => wallet.disconnect()}
                    wallet={convertSolanaConnectedWalletToEmbeddedWallet(
                      wallet,
                    )}
                    mutateWallets={mutateWallets}
                    isProcessing={isProcessing}
                    allWalletAddresses={allWalletAddresses}
                    onPayEap={() =>
                      onSelectWallet(
                        convertSolanaConnectedWalletToEmbeddedWallet(wallet),
                      )
                    }
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

          {legacyWallets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Legacy Embedded Wallets
              </h3>
              <div className="space-y-2">
                {legacyWallets.map((wallet) => (
                  <WalletCardEap
                    key={wallet.publicKey}
                    wallet={wallet}
                    isEmbeddedWallet={true}
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
