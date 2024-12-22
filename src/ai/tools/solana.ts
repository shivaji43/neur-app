import { z } from "zod";
import { SolanaUtils } from "@/lib/solana";
import { getBalance, searchWalletAssets } from "@/lib/solana/helius";
import { transformToPortfolio } from "@/types/helius/portfolio";

const publicKeySchema = z.string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address format. Must be a base58 encoded string.')
    .describe('The Solana wallet address to get the balance of.');

const domainSchema = z.string()
    .regex(/^[a-zA-Z0-9-]+\.sol$/, 'Invalid Solana domain format. Must be a valid Solana domain name.')
    .describe('The Solana domain name to resolve to an address.');

const wallet = {
    resolveSolanaDomain: {
        description: 'Resolve a Solana domain name to an address.',
        parameters: z.object({ domain: domainSchema }),
        execute: async ({ domain }: { domain: string }) => {
            return await SolanaUtils.resolveDomainToAddress(domain);
        },
    },
    getWalletPortfolio: {
        description: 'Get the portfolio of a Solana wallet, including detailed token information & total value, SOL value etc.',
        parameters: z.object({ walletAddress: publicKeySchema }),
        execute: async ({ walletAddress }: { walletAddress: string }) => {
            const { fungibleTokens } = await searchWalletAssets(walletAddress);
            const portfolio = transformToPortfolio(walletAddress, fungibleTokens, []);
            portfolio.tokens = portfolio.tokens
                // Filter tokens with value > $10
                .filter(token => token.balance * token.pricePerToken > 10 || token.symbol === "SOL")
                // Sort tokens by value
                .sort((a, b) => b.balance * b.pricePerToken - a.balance * a.pricePerToken)
                // Limit to 10 tokens
                .slice(0, 10);

            // make SOL token the first one
            const solanaToken = portfolio.tokens.find(token => token.symbol === "SOL");
            if (solanaToken) {
                portfolio.tokens.unshift(solanaToken);
            }

            return portfolio;
        },
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