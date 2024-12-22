export interface Suggestion {
    title: string
    subtitle: string
}

export const SUGGESTIONS: Suggestion[] = [
    {
        title: "Launch a new token",
        subtitle: "deploy a new token on pump.fun"
    },
    {
        title: "What has toly been doing recently?",
        subtitle: "summarize his recent tweets"
    },
    {
        title: "Swap 1 SOL for USDC",
        subtitle: "using Jupiter to swap on Solana"
    },
    {
        title: "What's trending on Solana?",
        subtitle: "find the current market trends"
    },
    {
        title: "Any updates from @phantom recently?",
        subtitle: "summarize the latest tweets from @phantom"
    }
]

export function getRandomSuggestions(count: number): Suggestion[] {
    const startIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % SUGGESTIONS.length
    return Array.from({ length: count }, (_, i) =>
        SUGGESTIONS[(startIndex + i) % SUGGESTIONS.length]
    )
}