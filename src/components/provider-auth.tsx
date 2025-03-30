'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import  { SolanaCluster } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { useTheme } from 'next-themes';

import { RPC_URL } from '@/lib/constants';

const isDev = process.env.NEXT_PUBLIC_DEV === 'true';

const solanaCluster: SolanaCluster = isDev
  ? { name: 'devnet', rpcUrl: process.env.NEXT_PUBLIC_HELIUS_RPC_URL! }
  : { name: 'mainnet-beta', rpcUrl: RPC_URL };

const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: false,
});

export default function AuthProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: resolvedTheme as 'light' | 'dark',
          logo: resolvedTheme === 'dark' ? '/letter_w.svg' : '/letter.svg',
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors as any,
          },
        },
        solanaClusters: [solanaCluster],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
