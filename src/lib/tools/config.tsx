'use client'

import React, { ReactNode } from "react"
import { TokenGrid } from "@/components/message/token-grid"
import { WalletPortfolio } from "@/components/message/wallet-portfolio"
import { WalletPortfolio as Portfolio } from "@/types/helius/portfolio"
import { ClientTweetCard } from "@/components/tweet-card"

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
        renderResult: (result: unknown) => {
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