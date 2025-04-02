import { resolve } from '@bonfida/spl-name-service';
import { ConnectedSolanaWallet } from '@privy-io/react-auth/solana';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { WalletAdapter } from 'solana-agent-kit';

import { EmbeddedWallet } from '@/types/db';

import { RPC_URL } from '../constants';
import { error } from 'console';

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export const createConnection = () => new Connection(RPC_URL);

export interface TransferWithMemoParams {
  /** Target address */
  to: string;
  /** Transfer amount (in SOL) */
  amount: number;
  /** Attached message */
  memo: string;
}

export interface PrivyConnectedWalletsParams {
  wallets: ConnectedSolanaWallet[];
  ready: boolean;
}

export class SolanaUtils {
  private static connection = new Connection(RPC_URL);

  /**
   * Resolve .sol domain name to address
   * @param domain Domain name
   */
  static async resolveDomainToAddress(domain: string): Promise<string | null> {
    const owner = await resolve(this.connection, domain);
    return owner.toBase58();
  }

  static isConnectedSolanaWallet(
    wallet: EmbeddedWallet | ConnectedSolanaWallet,
  ): wallet is ConnectedSolanaWallet {
    return 'getProvider' in wallet && typeof wallet.getProvider === 'function';
  }

  /**
   * Get wallet SOL balance
   * @param address Wallet address or .sol domain
   */
  static async getBalance(address: string): Promise<number> {
    try {
      let publicKeyStr = address;

      // If it's a .sol domain, resolve to address first
      if (address.toLowerCase().endsWith('.sol')) {
        const resolvedAddress = await this.resolveDomainToAddress(address);
        if (!resolvedAddress) {
          throw new Error('Failed to resolve domain name');
        }
        publicKeyStr = resolvedAddress;
      }

      const balance = await this.connection.getBalance(
        new PublicKey(publicKeyStr),
      );
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return 0;
    }
  }

  static async getPhantomProvider(): Promise<PhantomProvider | null> {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        if (!provider.publicKey) {
          try {
            await provider.connect();
          } catch (err) {
            console.error('Failed to connect to Phantom wallet:', err);
            return null;
          }
        }
        return provider;
      }
    }

    // Fallback to window.solana
    if (window.solana?.isPhantom) {
      if (!window.solana.publicKey) {
        try {
          await window.solana.connect();
        } catch (err) {
          console.error('Failed to connect to Phantom wallet:', err);
          return null;
        }
      }
      return window.solana;
    }

    return null;
  }

  /**
   * Send SOL transfer transaction with memo
   *
   * Case 1: Connected External Wallets (e.g., Phantom, Solflare):
   *         We can use the wallet provider’s `signTransaction` method to sign and send transactions directly from the client.
   *
   * Case 2: Server-side legacy wallets (non-Privy, stored encrypted in DB):
   *         We use the SolanaAgentKit to decrypt and initialize the wallet, and sign/send the transaction server-side.
   */
  static async sendTransferWithMemo(
    params: TransferWithMemoParams,
    wallet: EmbeddedWallet | ConnectedSolanaWallet,
  ): Promise<string | null> {
    if (!wallet) {
      throw new Error('No valid wallets selected');
    }

    if (this.isConnectedSolanaWallet(wallet)) {
      console.log('wallet is connected');
      const connectedSolanaWallet = wallet as ConnectedSolanaWallet;
      if (!connectedSolanaWallet.address) {
        throw new Error('Wallet not connected');
      }
      const { to, amount, memo } = params;
      const fromPubkey = new PublicKey(connectedSolanaWallet.address);
      const toPubkey = new PublicKey(to);

      if (!fromPubkey) {
        throw new Error('Invalid sender address.');
      }

      // Check balance first
      const balance = await this.connection.getBalance(fromPubkey);
      const requiredAmount = amount * LAMPORTS_PER_SOL;
      if (balance < requiredAmount) {
        throw new Error(
          `Insufficient balance. You have ${balance / LAMPORTS_PER_SOL} SOL but need ${amount} SOL`,
        );
      }

      try {
        // Create transaction
        const transaction = new Transaction();
        transaction.feePayer = fromPubkey;

        // Create transfer instruction
        const transferInstruction = SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: requiredAmount,
        });

        // Create Memo instruction
        const memoInstruction = new TransactionInstruction({
          keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: true }],
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(memo, 'utf-8'),
        });

        transaction.add(transferInstruction);
        transaction.add(memoInstruction);

        // Get latest blockhash
        const { blockhash } =
          await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;

        // Sign transaction
        const signedTransaction =
          await connectedSolanaWallet.signTransaction(transaction);

        // Send transaction and return signature immediately
        const signature = await this.connection.sendRawTransaction(
          signedTransaction.serialize(),
          {
            skipPreflight: false,
            maxRetries: 5,
            preflightCommitment: 'confirmed',
          },
        );

        // Log for debugging
        console.log('Transaction sent successfully:', signature);

        // Return signature immediately without waiting for confirmation
        return signature;
      } catch (error: unknown) {
        console.error('TEST Transaction error:', error);
        if (error instanceof Error) {
          // Handle insufficient funds error
          if (error.toString().includes('insufficient lamports')) {
            throw new Error(
              `Insufficient balance. Please make sure you have enough SOL to cover the transaction.`,
            );
          }
          // Handle other known errors
          if (error.toString().includes('Transaction simulation failed')) {
            throw new Error(`Transaction failed. Please try again.`);
          }
        }
        throw error;
      }
    } else {
      console.log('wallet is embedded');
      const embeddedWallet = wallet as EmbeddedWallet;
      // TODO: handle embedded wallet transfer
      return null;
    }
  }
}
