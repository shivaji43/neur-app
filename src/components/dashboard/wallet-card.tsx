'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useDelegatedActions } from '@privy-io/react-auth';
import { useFundWallet, useSolanaWallets } from '@privy-io/react-auth/solana';
import {
  ArrowRightFromLine,
  ArrowUpDown,
  Banknote,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyableText } from '@/components/ui/copyable-text';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SolanaUtils } from '@/lib/solana';
import { cn } from '@/lib/utils';
import {
  embeddedWalletSendSOL,
  setActiveWallet,
} from '@/server/actions/wallet';
import { EmbeddedWallet } from '@/types/db';

/**
 * Constants for wallet operations
 */
const PERCENTAGE_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
];
const TRANSACTION_FEE_RESERVE = 0.005; // SOL amount reserved for transaction fees
const MIN_AMOUNT = 0.000001; // Minimum transaction amount in SOL

interface WalletCardProps {
  wallet: EmbeddedWallet;
  // from the parent SWR, re-fetches the entire wallet list
  mutateWallets: () => Promise<EmbeddedWallet[] | undefined>;
}

/**
 * WalletCard with an improved layout:
 * - "Active" & "Delegated" displayed as small badges in top-left.
 * - Buttons for Fund/Send (primary), Delegate/Revoke + Export if relevant, and Set Active if not active.
 * - The active wallet is also highlighted with a different border.
 */
export function WalletCard({ wallet, mutateWallets }: WalletCardProps) {
  const { fundWallet } = useFundWallet();
  const { exportWallet } = useSolanaWallets();
  const { delegateWallet, revokeWallets } = useDelegatedActions();

  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<
    'idle' | 'processing' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPrivyWallet = wallet.walletSource === 'PRIVY';

  const {
    data: balance = 0,
    isLoading: isBalanceLoading,
    mutate: mutateBalance,
  } = useSWR(
    ['solana-balance', wallet.publicKey],
    () => SolanaUtils.getBalance(wallet.publicKey),
    { refreshInterval: 30000 },
  );

  /**
   * Refresh wallet list + this wallet's balance
   */
  async function refreshWalletData() {
    await mutateWallets();
    await mutateBalance();
  }

  async function handleDelegationToggle() {
    try {
      setIsLoading(true);
      if (!wallet.delegated) {
        // Turn ON delegation
        await delegateWallet({
          address: wallet.publicKey,
          chainType: 'solana',
        });
        toast.success('Wallet delegated');
      } else {
        // Turn OFF delegation
        await revokeWallets();
        toast.success('Delegation revoked');
      }
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to update delegation');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetActive() {
    if (wallet.active) return;
    try {
      setIsLoading(true);
      await setActiveWallet({ publicKey: wallet.publicKey });
      toast.success('Wallet set as active');
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to set wallet as active');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFundWallet() {
    try {
      setIsLoading(true);
      await fundWallet(wallet.publicKey, { cluster: { name: 'mainnet-beta' } });
      toast.success('Wallet funded');
      await refreshWalletData();
    } catch (err) {
      toast.error('Failed to fund wallet');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Send SOL (Dialog logic)
   */
  async function handleSendSol() {
    try {
      setSendStatus('processing');
      setIsLoading(true);
      setErrorMessage(null);

      const result = await embeddedWalletSendSOL({
        walletId: wallet.id,
        recipientAddress,
        amount: parseFloat(amount),
      });
      const data = result?.data;
      const chainTxHash = data?.data;

      if (data?.success && chainTxHash) {
        setTxHash(chainTxHash);
        setSendStatus('success');
        toast.success('Transaction Successful', {
          description: 'Transaction confirmed on-chain.',
        });
      } else {
        setSendStatus('error');
        setErrorMessage(data?.error || 'Unknown error');
        toast.error('Transaction Failed', {
          description: data?.error || 'Unexpected error occurred.',
        });
      }
      // Re-fetch balance
      await mutateBalance();
    } catch (error) {
      setSendStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMsg);
      toast.error('Transaction Failed', { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }

  function handleCloseDialog() {
    // Reset dialog state
    setIsSendDialogOpen(false);
    setSendStatus('idle');
    setTxHash(null);
    setErrorMessage(null);
    setRecipientAddress('');
    setAmount('');
  }

  return (
    <>
      <Card className="relative overflow-hidden transition-all duration-300 hover:border-primary/30">
        <CardContent className="space-y-4 p-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {wallet?.active && (
              <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Active
              </div>
            )}
            {isPrivyWallet && wallet?.delegated && (
              <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Delegated
              </div>
            )}
          </div>

          {/* Balance Section */}
          <div className="space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">
              Available Balance
            </Label>
            <div className="flex items-baseline gap-2">
              {isBalanceLoading ? (
                <Skeleton className="h-9 w-32" />
              ) : (
                <>
                  <span className="text-3xl font-bold tabular-nums tracking-tight">
                    {balance?.toFixed(4)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    SOL
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Public Key Section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-muted-foreground">
              Public Key
            </Label>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <CopyableText text={wallet?.publicKey || ''} showSolscan />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              onClick={handleFundWallet}
              disabled={isLoading}
            >
              <Banknote className="mr-2 h-4 w-4" />
              Fund
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsSendDialogOpen(true)}
              disabled={isLoading}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Send
            </Button>

            {isPrivyWallet && (
              <>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => exportWallet({ address: wallet.publicKey })}
                  disabled={isLoading}
                >
                  <ArrowRightFromLine className="mr-2 h-4 w-4" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    'w-full sm:w-auto',
                    wallet?.delegated ? 'hover:bg-destructive' : '',
                  )}
                  onClick={handleDelegationToggle}
                  disabled={isLoading}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {wallet?.delegated ? 'Revoke' : 'Delegate'}
                </Button>
              </>
            )}

            {!wallet?.active && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleSetActive}
                disabled={isLoading}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Set Active
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ignore the Send SOL Dialog for now -- as requested */}
      <AlertDialog
        open={isSendDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open && sendStatus !== 'processing') {
            handleCloseDialog();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send SOL</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="mt-2 space-y-4">
            {/* Balance Display */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
              <span className="text-sm text-muted-foreground">
                Available Balance:
              </span>
              <span className="text-base font-medium">
                {isBalanceLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : (
                  <span>{balance.toFixed(4)} SOL</span>
                )}
              </span>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Send SOL to any Solana wallet address. Double-check the address
              before sending.
            </AlertDialogDescription>
          </div>

          {sendStatus === 'idle' && (
            <div className="grid gap-4 py-4">
              {/* Recipient Address */}
              <div className="space-y-2">
                <Label>Recipient Address</Label>
                <Input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter Solana address"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (SOL)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    if (
                      e.target.value === '' ||
                      /^\d*\.?\d*$/.test(e.target.value)
                    ) {
                      const numValue = parseFloat(e.target.value);
                      if (e.target.value === '' || numValue <= balance) {
                        setAmount(e.target.value);
                      }
                    }
                  }}
                  placeholder={`Enter amount (max ${(balance - TRANSACTION_FEE_RESERVE).toFixed(4)} SOL)`}
                />
                {amount && !isNaN(parseFloat(amount)) && (
                  <div className="text-sm text-muted-foreground">
                    You will send {parseFloat(amount).toFixed(4)} SOL
                    {parseFloat(amount) > balance - TRANSACTION_FEE_RESERVE && (
                      <div className="mt-1 text-destructive">
                        Insufficient balance (reserve 0.005 SOL for fees)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-2">
                {PERCENTAGE_OPTIONS.map(({ label, value }) => {
                  const calc = (balance - TRANSACTION_FEE_RESERVE) * value;
                  return (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(calc.toFixed(4))}
                      className={cn(
                        'min-w-[60px]',
                        amount === calc.toFixed(4) &&
                          'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                      )}
                      disabled={balance <= TRANSACTION_FEE_RESERVE}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {sendStatus === 'success' && txHash && (
            <div className="truncate py-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">Transaction Hash:</p>
                <CopyableText text={txHash} showSolscan />
              </div>
            </div>
          )}

          {sendStatus === 'error' && errorMessage && (
            <div className="py-4">
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                {errorMessage}
              </div>
            </div>
          )}

          <AlertDialogFooter className="flex items-center justify-between gap-4">
            <Link
              href="/faq#send-sol"
              className="flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Need help?
            </Link>

            <div className="flex gap-2">
              {sendStatus === 'idle' && (
                <>
                  <AlertDialogCancel disabled={isLoading}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    onClick={handleSendSol}
                    disabled={
                      isLoading ||
                      !recipientAddress ||
                      !amount ||
                      parseFloat(amount) < MIN_AMOUNT ||
                      parseFloat(amount) > balance - TRANSACTION_FEE_RESERVE
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </>
              )}

              {(sendStatus === 'success' || sendStatus === 'error') && (
                <Button onClick={handleCloseDialog}>Close</Button>
              )}
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
