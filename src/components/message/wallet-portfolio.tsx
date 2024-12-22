'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNumber } from "@/lib/format"
import { WalletPortfolio as Portfolio } from "@/types/helius/portfolio"
import { ScrollArea } from "../ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { cn } from "@/lib/utils"
import { ExternalLink, TrendingUp, Wallet } from "lucide-react"

interface WalletPortfolioProps {
    data: Portfolio
    className?: string
    isLoading?: boolean
}

function getInitials(name: string) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

function TokenCardSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border bg-muted/40 p-6">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 rounded-lg bg-muted" />
                    <div className="h-4 w-24 rounded-lg bg-muted" />
                </div>
                <div className="space-y-2 text-right">
                    <div className="h-5 w-28 rounded-lg bg-muted" />
                    <div className="h-4 w-20 rounded-lg bg-muted" />
                </div>
            </div>
        </div>
    )
}

function TokenRow({ token, index }: { token: Portfolio['tokens'][0], index: number }) {
    const hasPrice = token.pricePerToken > 0

    return (
        <a
            href={`https://solscan.io/token/${token.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/30",
                "border border-border/50",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-1 hover:border-border/80",
                "hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.2)]",
                "active:translate-y-0 active:shadow-none",
            )}
        >
            <div className="relative flex items-center justify-between p-6">
                {/* Background Gradient Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Token Info */}
                <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12 rounded-xl border bg-gradient-to-br from-background to-muted">
                        <AvatarImage
                            src={token.imageUrl}
                            alt={token.name}
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <AvatarFallback className="rounded-xl text-sm">
                            {getInitials(token.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="truncate font-medium">{token.name}</div>
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                {token.symbol}
                            </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                {token.balance.toLocaleString(undefined, {
                                    maximumFractionDigits: 4
                                })} {token.symbol}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Price Info */}
                <div className="flex flex-col items-end gap-1.5">
                    <div className="font-medium">
                        {formatNumber(token.balance * token.pricePerToken, 'currency')}
                    </div>
                    {hasPrice && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>@ {token.pricePerToken.toFixed(4)} $</span>
                            <ExternalLink className="h-3.5 w-3.5 transition-colors group-hover:text-primary" />
                        </div>
                    )}
                </div>
            </div>
        </a>
    )
}

export function WalletPortfolio({ data, className, isLoading = false }: WalletPortfolioProps) {
    if (isLoading) {
        return (
            <Card className={cn(
                "mt-3 overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/30",
                "transition-all duration-300 ease-out",
                "hover:border-border/80 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.2)]",
                className
            )}>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="h-7 w-36 rounded-lg bg-muted animate-pulse" />
                        <div className="h-7 w-28 rounded-lg bg-muted animate-pulse" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[480px] pr-4">
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TokenCardSkeleton key={i} />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={cn(
            "mt-3 overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/30",
            "transition-all duration-300 ease-out",
            "hover:border-border/80 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.2)]",
            className
        )}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            <span>Portfolio Value</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span>{data.tokens.length} tokens</span>
                        </div>
                    </div>
                    <span className="text-lg font-medium">
                        {formatNumber(data.totalBalance, 'currency')}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[480px] pr-4">
                    <div className="space-y-3">
                        {data.tokens.map((token, index) => (
                            <TokenRow key={index} token={token} index={index} />
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
} 