import { z } from "zod"
import { filterSolanaTokens } from "@/lib/solana/integrations/defined_fi"
import { TokenData } from "@/lib/solana/integrations/defined_fi";

type FilterTokensParams = {
    maxVolume24h?: number;
    minVolume24h?: number;
    maxLiquidity?: number;
    minLiquidity?: number;
    maxMarketCap?: number;
    minMarketCap?: number;
    minTransactions24h?: number;
    createdWithinHours?: number;
    excludeScams?: boolean;
    sortBy?: 'trendingScore24' | 'marketCap' | 'volume24' | 'liquidity' | 'transactions24h';
    sortDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
}

type FilterTokensResponse = {
    data: {
        filterTokens: {
            results: TokenData[];
        };
    };
};

export const definedTools = {
    filterTrendingTokens: {
        description: 'Filter and search for trending Solana tokens based on various criteria.',
        parameters: z.object({
            maxVolume24h: z.number().optional().describe('Maximum 24-hour trading volume in USD'),
            minVolume24h: z.number().optional().describe('Minimum 24-hour trading volume in USD'),
            maxLiquidity: z.number().optional().describe('Maximum liquidity in USD'),
            minLiquidity: z.number().optional().describe('Minimum liquidity in USD'),
            maxMarketCap: z.number().optional().describe('Maximum market cap in USD'),
            minMarketCap: z.number().optional().describe('Minimum market cap in USD'),
            createdWithinHours: z.number().optional().describe('Only show tokens created within the last N hours'),
            sortBy: z.enum(['trendingScore24', 'marketCap', 'volume24', 'liquidity', 'transactions24h']).optional().describe('Sort results by this metric'),
            sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
            limit: z.number().min(1).max(20).optional().describe('Maximum number of results to return')
        }),
        execute: async ({
            maxVolume24h = 100000000000,
            minVolume24h = 0,
            maxLiquidity = 250000000,
            minLiquidity = 0,
            maxMarketCap = 1000000000000,
            minMarketCap = 0,
            createdWithinHours = 24,
            sortBy = 'trendingScore24',
            sortDirection = 'DESC',
            limit = 50
        }: FilterTokensParams) => {
            const filters: any = {
                potentialScam: false,
                network: [1399811149]
            }

            if (maxVolume24h || minVolume24h) {
                filters.volume24 = {}
                if (maxVolume24h) filters.volume24.lte = maxVolume24h
                if (minVolume24h) filters.volume24.gte = minVolume24h
            }

            if (maxLiquidity || minLiquidity) {
                filters.liquidity = {}
                if (maxLiquidity) filters.liquidity.lte = maxLiquidity
                if (minLiquidity) filters.liquidity.gte = minLiquidity
            }

            if (maxMarketCap || minMarketCap) {
                filters.marketCap = {}
                if (maxMarketCap) filters.marketCap.lte = maxMarketCap
                if (minMarketCap) filters.marketCap.gte = minMarketCap
            }

            if (createdWithinHours) {
                filters.createdAt = {
                    gte: Math.floor(Date.now() / 1000) - (createdWithinHours * 3600)
                }
            }

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('filterTrendingTokens timeout after 10s')), 10000);
            });

            try {
                const response = await Promise.race([
                    filterSolanaTokens({
                        filters,
                        statsType: "FILTERED",
                        offset: 0,
                        limit: 50,
                        rankings: [
                            {
                                attribute: 'trendingScore24',
                                direction: 'DESC'
                            }
                        ]
                    }),
                    timeoutPromise
                ]) as FilterTokensResponse;

                return response.data.filterTokens.results
                    .slice(0, limit)
                    .map((token: TokenData) => ({
                        address: token.token.address,
                        name: token.token.name,
                        symbol: token.token.symbol,
                        marketCap: token.marketCap,
                        volume24: token.volume24,
                        liquidity: token.liquidity,
                        transactions24h: token.uniqueTransactions24,
                        trendingScore24: token.uniqueTransactions24,
                        image: token.token.imageThumbUrl
                    }))
                    .sort((a, b) => {
                        const getValue = (obj: any, key: string) => parseFloat(obj[key] || '0');
                        if (sortDirection === 'ASC') {
                            return getValue(a, sortBy) - getValue(b, sortBy);
                        }
                        return getValue(b, sortBy) - getValue(a, sortBy);
                    });
            } catch (error) {
                console.error('[filterTrendingTokens] Error:', error);
                return {
                    error: 'EXECUTION_ERROR'
                };
            }
        }
    }
}