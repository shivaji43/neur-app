import { z } from "zod";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// Types
interface MagicEdenStats {
    symbol: string;
    floorPrice: number;
    listedCount: number;
    avgPrice24hr: number;
    volumeAll: number;
}

interface MagicEdenActivity {
    signature: string;
    type: string;
    source: string;
    collection: string;
    collectionSymbol: string;
    slot: number;
    blockTime: number;
    buyer?: string;
    seller?: string;
    buyerReferral: string;
    sellerReferral: string;
    price: number;
    priceInfo: {
        solPrice: {
            rawAmount: string;
            address: string;
            decimals: number;
        };
    };
}

interface MagicEdenCollection {
    symbol: string;
    name: string;
    description: string;
    image: string;
    floorPrice: number;
    volumeAll: number;
    hasCNFTs: boolean;
}

// Helper Functions
const formatSOL = (lamports: number) => {
    return (lamports / 1e9).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
};

// Components
const CollectionStats = ({ stats }: { stats: MagicEdenStats }) => {
    return (
        <Card className="p-4 space-y-4 bg-muted/50">
            <h3 className="text-lg font-medium">Collection Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-sm font-medium text-muted-foreground">Floor Price</div>
                    <div className="mt-1 text-xl font-semibold">◎ {formatSOL(stats.floorPrice)}</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-sm font-medium text-muted-foreground">Listed</div>
                    <div className="mt-1 text-xl font-semibold">{stats.listedCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-sm font-medium text-muted-foreground">Avg Price (24h)</div>
                    <div className="mt-1 text-xl font-semibold">◎ {formatSOL(stats.avgPrice24hr)}</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                    <div className="text-sm font-medium text-muted-foreground">Total Volume</div>
                    <div className="mt-1 text-xl font-semibold">◎ {formatSOL(stats.volumeAll)}</div>
                </div>
            </div>
        </Card>
    );
};

const ActivityList = ({ activities }: { activities: MagicEdenActivity[] }) => {
    return (
        <Card className="p-4 space-y-4 bg-muted/50">
            <h3 className="text-lg font-medium">Recent Activities</h3>
            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={
                                    activity.type === 'bid' ? 'secondary' :
                                        activity.type === 'list' ? 'outline' :
                                            activity.type === 'delist' ? 'destructive' :
                                                'default'
                                }>
                                    {activity.type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">via {activity.source}</span>
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">◎ {activity.price}</span>
                                <span className="mx-2 text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{formatTimestamp(activity.blockTime)}</span>
                            </div>
                        </div>
                        <a
                            href={`https://solscan.io/tx/${activity.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const PopularCollections = ({ collections }: { collections: MagicEdenCollection[] }) => {
    return (
        <Card className="p-4 space-y-4 bg-muted/50">
            <h3 className="text-lg font-medium">Popular Collections</h3>
            <div className="space-y-3">
                {collections.map((collection, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-background/50">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            <Image
                                src={collection.image}
                                alt={collection.name}
                                className="object-cover"
                                fill
                                sizes="48px"
                                onError={(e) => {
                                    // @ts-expect-error - Type 'string' is not assignable to type 'never'
                                    e.target.src = '/placeholder.png'
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium truncate">{collection.name}</h4>
                                <Badge variant="outline" className="ml-2">
                                    #{index + 1}
                                </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                <span>Floor: ◎ {formatSOL(collection.floorPrice)}</span>
                                <span>Volume: ◎ {formatSOL(collection.volumeAll)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

// Tools Export
export const magicEdenTools = {
    getCollectionStats: {
        displayName: "📊 Collection Stats",
        description: "Get detailed statistics for a Magic Eden collection including floor price, listed count, average price, and total volume.",
        parameters: z.object({
            symbol: z.string().describe("The collection symbol/slug to check")
        }),
        execute: async ({ symbol }: { symbol: string }) => {
            try {
                const response = await fetch(
                    `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch collection stats: ${response.statusText}`);
                }

                const data = await response.json() as MagicEdenStats;
                return {
                    suppressFollowUp: true,
                    data
                };
            } catch (error) {
                throw new Error(`Failed to get collection stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        render: (raw: unknown) => {
            const result = (raw as { data: MagicEdenStats }).data;
            return <CollectionStats stats={result} />;
        }
    },

    getCollectionActivities: {
        displayName: "📈 Collection Activities",
        description: "Get recent trading activities for a Magic Eden collection including bids, listings, and sales.",
        parameters: z.object({
            symbol: z.string().describe("The collection symbol/slug to check")
        }),
        execute: async ({ symbol }: { symbol: string }) => {
            try {
                const response = await fetch(
                    `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/activities`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch collection activities: ${response.statusText}`);
                }

                const data = await response.json() as MagicEdenActivity[];
                // Only return the most recent 10 activities
                return {
                    suppressFollowUp: true,
                    data: data.slice(0, 10)
                };
            } catch (error) {
                throw new Error(`Failed to get collection activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        render: (raw: unknown) => {
            const result = (raw as { data: MagicEdenActivity[] }).data;
            return <ActivityList activities={result} />;
        }
    },

    getPopularCollections: {
        displayName: "🔥 Popular Collections",
        description: "Get the most popular collections on Magic Eden based on volume and activity.",
        parameters: z.object({
            timeRange: z.enum(['1h', '1d', '7d', '30d']).describe("Time range for popularity metrics"),
            limit: z.number().min(1).max(50).default(10).describe("Number of collections to return (max 50)")
        }),
        execute: async ({ timeRange, limit }: { timeRange: string, limit: number }) => {
            try {
                const response = await fetch(
                    `https://api-mainnet.magiceden.dev/v2/marketplace/popular_collections?time_range=${timeRange}&limit=${limit}`,
                    { headers: { 'Accept': 'application/json' } }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch popular collections: ${response.statusText}`);
                }

                const data = await response.json() as MagicEdenCollection[];

                // Remove duplicate collections (same symbol)
                const uniqueCollections = data.filter((collection, index, self) =>
                    index === self.findIndex((c) => c.symbol === collection.symbol)
                );

                return {
                    suppressFollowUp: true,
                    data: uniqueCollections.slice(0, limit)
                };
            } catch (error) {
                throw new Error(`Failed to get popular collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        render: (raw: unknown) => {
            const result = (raw as { data: MagicEdenCollection[] }).data;
            return <PopularCollections collections={result} />;
        }
    }
};
