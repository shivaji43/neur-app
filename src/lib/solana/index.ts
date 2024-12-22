import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { resolve } from '@bonfida/spl-name-service';

const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'

export const createConnection = () => new Connection(RPC_URL);

export interface TransferWithMemoParams {
    /** Target address */
    to: string
    /** Transfer amount (in SOL) */
    amount: number
    /** Attached message */
    memo: string
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

            const balance = await this.connection.getBalance(new PublicKey(publicKeyStr));
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
     */
    static async sendTransferWithMemo(params: TransferWithMemoParams): Promise<string | null> {
        try {
            const provider = await this.getPhantomProvider();
            if (!provider) {
                throw new Error('Phantom wallet not found or connection rejected');
            }

            if (!provider.publicKey) {
                throw new Error('Wallet not connected');
            }

            const { to, amount, memo } = params;
            const fromPubkey = provider.publicKey;
            const toPubkey = new PublicKey(to);

            // Create transaction
            const transaction = new Transaction();

            // Set payer
            transaction.feePayer = fromPubkey;

            // Create transfer instruction
            const transferInstruction = SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: amount * LAMPORTS_PER_SOL,
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
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            // Sign transaction first
            const signedTransaction = await provider.signTransaction(transaction);

            // Send signed transaction
            const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

            // Confirm transaction
            const confirmation = await this.connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight: await this.connection.getBlockHeight()
            });

            if (confirmation.value.err) {
                return null;
            }

            return signature;
        } catch (error) {
            console.error("Transaction error:", error)
            return null;
        }
    }
}