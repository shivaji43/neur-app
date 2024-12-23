'use client'

import React, { ReactNode } from "react"
import { TokenGrid } from "@/components/message/token-grid"
import { WalletPortfolio } from "@/components/message/wallet-portfolio"
import { WalletPortfolio as Portfolio } from "@/types/helius/portfolio"
import { ClientTweetCard } from "@/components/tweet-card"
import { Check, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
function parseTweetIds(result: string): string[] {
    const ids: string[] = []
    const regex = /Conversation ID: (\d+)/g
    let match

    while ((match = regex.exec(result)) !== null) {
        ids.push(match[1])
    }

    return [...new Set(ids)]
}

export interface ToolConfig {
    displayName: string
    description?: string
    icon?: ReactNode
    isCollapsible?: boolean
    renderResult: (result: unknown) => React.ReactNode
}

function DefaultResultRenderer({ result }: { result: unknown }) {
    if (result && typeof result === 'object' && 'error' in result) {
        return (
            <div className="pl-3.5 mt-2 text-sm text-destructive">
                {String((result as { error: unknown }).error)}
            </div>
        )
    }

    return (
        <div className="pl-3.5 mt-2 text-xs font-mono border-l border-border/40 text-muted-foreground/90">
            <pre className="whitespace-pre-wrap break-all truncate max-h-[200px] max-w-[400px]">
                {JSON.stringify(result, null, 2).trim()}
            </pre>
        </div>
    )
}

export const toolConfigs: Record<string, ToolConfig> = {
    launchToken: {
        displayName: "💊 Launch Token",
        description: "Launch a new token on PumpFun",
        renderResult: (raw: unknown) => {
            const result = raw as { success: boolean; data?: any; error?: string };

            if (!result.success) {
                return (
                    <Alert variant="destructive" className="mt-3">
                        <X className="h-4 w-4" />
                        <AlertTitle>Launch Failed</AlertTitle>
                        <AlertDescription>
                            {result.error || "Failed to launch token"}
                        </AlertDescription>
                    </Alert>
                );
            }

            return (
                <Alert className="mt-3" variant="success">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Token Launched Successfully</AlertTitle>
                    <AlertDescription className="mt-2">
                        <div className="grid gap-2 text-sm">
                            <div>Token Address: {result.data?.address}</div>
                            {result.data?.transactionId && (
                                <div>
                                    Transaction:{" "}
                                    <a
                                        href={`https://solscan.io/tx/${result.data.transactionId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        View on Solscan
                                    </a>
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            );
        }
    },
    filterTrendingTokens: {
        displayName: "🔍 Trending Tokens",
        description: "Search and filter trending tokens on Solana",
        renderResult: (raw: unknown) => {
            const result = (raw as { data: any }).data;
            return (
                <TokenGrid
                    tokens={Array.isArray(result) ? result : []}
                    className="mt-3"
                    isLoading={!Array.isArray(result)}
                />
            )
        }
    },
    getWalletPortfolio: {
        displayName: "💰 Wallet Portfolio",
        description: "Display wallet portfolio information",
        renderResult: (raw: unknown) => {
            const result = (raw as { data: any }).data;
            if (!result || typeof result !== 'object') return null;
            return <WalletPortfolio data={result as Portfolio} />;
        }
    },
    search_x: {
        displayName: "🔍 Twitter Search",
        description: "Search tweets on Twitter",
        isCollapsible: true,
        renderResult: (result: unknown) => {
            if (!result || typeof result !== 'string') return null
            const ids = parseTweetIds(result)

            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ids.map(id => (
                        <ClientTweetCard key={id} id={id} />
                    ))}
                </div>
            )
        }
    }
}

export function getToolConfig(toolName: string): ToolConfig {
    return toolConfigs[toolName] || {
        displayName: toolName,
        description: "Tool result",
        isCollapsible: true,
        renderResult: (result) => <DefaultResultRenderer result={result} />
    }
} 