'use client'

// export const toolConfigs: Record<string, ToolConfig> = {
//     launchToken: {
//         displayName: "💊 Launch Token",
//         description: "Launch a new token on PumpFun",
//         renderResult: (raw: unknown) => {
//             const result = raw as { success: boolean; data?: any; error?: string };

//             if (!result.success) {
//                 return (
//                     <Alert variant="destructive" className="mt-3">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>Launch Failed</AlertTitle>
//                         <AlertDescription>
//                             {result.error || "Failed to launch token"}
//                         </AlertDescription>
//                     </Alert>
//                 );
//             }

//             return (
//                 <Alert className="mt-3" variant="success">
//                     <Check className="h-4 w-4" />
//                     <AlertTitle>Token Launched Successfully</AlertTitle>
//                     <AlertDescription className="mt-2">
//                         <div className="grid gap-2 text-sm">
//                             <div>Token Address: {result.data?.address}</div>
//                             {result.data?.transactionId && (
//                                 <div>
//                                     Transaction:{" "}
//                                     <a
//                                         href={`https://solscan.io/tx/${result.data.transactionId}`}
//                                         target="_blank"
//                                         rel="noopener noreferrer"
//                                         className="text-primary hover:underline"
//                                     >
//                                         View on Solscan
//                                     </a>
//                                 </div>
//                             )}
//                         </div>
//                     </AlertDescription>
//                 </Alert>
//             );
//         }
//     },
//     filterTrendingTokens: {
//         displayName: "🔍 Trending Tokens",
//         description: "Search and filter trending tokens on Solana",
//         renderResult: (raw: unknown) => {
//             const result = (raw as { data: any }).data;
//             return (
//                 <TokenGrid
//                     tokens={Array.isArray(result) ? result : []}
//                     className="mt-3"
//                     isLoading={!Array.isArray(result)}
//                 />
//             )
//         }
//     },
//     getWalletPortfolio: {
//         displayName: "💰 Wallet Portfolio",
//         description: "Display wallet portfolio information",
//         renderResult: (raw: unknown) => {
//             const result = (raw as { data: any }).data;
//             if (!result || typeof result !== 'object') return null;
//             return <WalletPortfolio data={result as Portfolio} />;
//         }
//     },
// }