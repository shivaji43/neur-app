import { z } from "zod";
import { SolanaUtils } from "@/lib/solana";
import { searchWalletAssets } from "@/lib/solana/helius";
import { transformToPortfolio } from "@/types/helius/portfolio";
import { WalletPortfolio } from "@/components/message/wallet-portfolio";

const publicKeySchema = z.string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address format. Must be a base58 encoded string.')
    .describe('A valid Solana wallet address. (base58 encoded)');

const domainSchema = z.string()
    .regex(/^[a-zA-Z0-9-]+\.sol$/, 'Invalid Solana domain format. Must be a valid Solana domain name.')
    .describe('A Solana domain name. (e.g. toly.sol). Needed for resolving a domain to an address.  ');

const wallet = {
    resolveSolanaDomain: {
        displayName: "🔍 Resolve Solana Domain",
        description: 'Resolve a Solana domain name to an address.',
        isCollapsible: true,
        parameters: z.object({ domain: domainSchema }),
        execute: async ({ domain }: { domain: string }) => {
            return await SolanaUtils.resolveDomainToAddress(domain);
        },
    },
    getWalletPortfolio: {
        displayName: "🏦 Wallet Portfolio",
        description: 'Get the portfolio of a Solana wallet, including detailed token information & total value, SOL value etc.',
        parameters: z.object({ walletAddress: publicKeySchema }),
        execute: async ({ walletAddress }: { walletAddress: string }) => {
            console.log('[getWalletPortfolio] walletAddress', walletAddress);
            try {
                const { fungibleTokens } = await searchWalletAssets(walletAddress);
                const portfolio = transformToPortfolio(walletAddress, fungibleTokens, []);
                const solanaToken = portfolio.tokens.find(token => token.symbol === "SOL");

                portfolio.tokens = portfolio.tokens
                    .filter(token => token.balance * token.pricePerToken > 10 || token.symbol === "SOL")
                    .sort((a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken)
                    .slice(0, 10);

                if (solanaToken) {
                    portfolio.tokens.unshift(solanaToken);
                } else {
                    console.error('[getWalletPortfolio] No SOL token found');
                }

                return {
                    suppressFollowUp: true,
                    data: portfolio,
                };
            } catch (error) {
                throw new Error(`Failed to get wallet portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        render: (raw: unknown) => {
            const result = (raw as { data: any }).data;
            if (!result || typeof result !== 'object') return null;
            return <WalletPortfolio data={result} />;
        }
    },
    batchGetTokenMarketCap: {
        description: 'Batch calculate the market cap of a list of tokens, based on their price_per_token',
        parameters: z.object({ pricePerToken: z.array(z.number()) }),
        execute: async ({ pricePerToken }: { pricePerToken: number[] }) => {
            return pricePerToken.map(price => price * 1000000000);
        },
    }
}

export const solanaTools = { ...wallet }