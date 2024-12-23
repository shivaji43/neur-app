import { z } from "zod";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { searchJupiterTokens } from "@/server/actions/jupiter";

// Types
interface JupiterToken {
    address: string;
    name: string;
    symbol: string;
    logoURI: string | null;
}

function TokenCard({ token }: { token: JupiterToken }) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
            <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                    <img
                        src={token.logoURI || "/placeholder.png"}
                        alt={token.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
                        }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-medium">
                            {token.name}
                        </h3>
                        <span className="shrink-0 rounded-md bg-background/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {token.symbol}
                        </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                        <span className="font-mono">
                            {token.address.slice(0, 4)}...{token.address.slice(-4)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const jupiterTools = {
    searchToken: {
        displayName: "🔍 Search Token",
        description: "Search for any Solana token by name or symbol to get its contract address (mint), along with detailed information like volume and logo. Useful for getting token addresses for further operations.",
        parameters: z.object({
            query: z.string().describe("Token name or symbol to search for"),
        }),
        execute: async ({ query }: { query: string }) => {
            try {
                const tokens = await searchJupiterTokens(query);
                const searchQuery = query.toLowerCase();

                // Search and rank tokens
                const results = tokens
                    .filter(token =>
                        token.name.toLowerCase().includes(searchQuery) ||
                        token.symbol.toLowerCase().includes(searchQuery)
                    )
                    .sort((a, b) => {
                        // Exact matches first
                        const aExact = a.symbol.toLowerCase() === searchQuery || a.name.toLowerCase() === searchQuery;
                        const bExact = b.symbol.toLowerCase() === searchQuery || b.name.toLowerCase() === searchQuery;
                        if (aExact && !bExact) return -1;
                        if (!aExact && bExact) return 1;
                        return 0;
                    })
                    .slice(0, 1);

                return {
                    success: true,
                    data: results
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to search tokens"
                };
            }
        },
        render: (result: unknown) => {
            const typedResult = result as { success: boolean, data?: JupiterToken[], error?: string };

            if (!typedResult.success) {
                return (
                    <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-destructive">Error: {typedResult.error}</p>
                        </div>
                    </div>
                );
            }

            if (!typedResult.data?.length) {
                return (
                    <div className="relative overflow-hidden rounded-2xl bg-muted/50 p-4">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground">No tokens found</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="space-y-2">
                    {typedResult.data.map((token) => (
                        <TokenCard key={token.address} token={token} />
                    ))}
                </div>
            );
        }
    }
}
