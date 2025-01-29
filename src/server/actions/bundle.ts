'use server';

import { cache } from 'react';



import { actionClient } from '@/lib/safe-action';
import { getMintAccountInfo, getTransactionHistory } from '@/lib/solana/helius';
import { Bundle, BundleDetectionSchema, BundleTransaction, MintBundleAnalysis } from '@/types/bundle';


// Group transactions by slot to identify bundles
async function identifyBundlesBySlot(
  mintAddress: string,
  minSlotTransactions: number = 2,
): Promise<MintBundleAnalysis | null> {
  try {
    // Get mint information
    const mintInfo = await getMintAccountInfo(mintAddress);
    const totalSupply = Number(mintInfo.supply) / 10 ** mintInfo.decimals;

    // Get transaction history
    const transactions = await getTransactionHistory(mintAddress);

    // Group transactions by slot
    const slotGroups = new Map<number, BundleTransaction[]>();

    for (const tx of transactions) {
      const slot = tx.slot;
      if (!slotGroups.has(slot)) {
        slotGroups.set(slot, []);
      }
      slotGroups.get(slot)?.push({
        signature: tx.signature,
        slot: tx.slot,
        timestamp: tx.timestamp,
        price: tx.price,
        quantity: tx.quantity,
      });
    }

    // Convert slot groups to bundles
    const bundles: Bundle[] = [];

    for (const [slot, txs] of slotGroups.entries()) {
      // Only consider slots with minimum required transactions
      if (txs.length < minSlotTransactions) continue;

      // Calculate bundle metrics
      const totalQuantity = txs.reduce((sum, tx) => sum + tx.quantity, 0);
      const supplyPercentage = (totalQuantity / totalSupply) * 100;
      const solSpent = txs.reduce((sum, tx) => sum + tx.price * tx.quantity, 0);

      const bundle: Bundle = {
        slot,
        bundleAddress: txs[0].signature, // Using first transaction signature as identifier
        transactions: txs,
        supplyPercentage,
        solSpent,
        currentHoldings: totalQuantity, // This should be updated with current holdings
        isPumpfunBundle: false, // This should be verified against pump.fun data
        avgPricePerToken: solSpent / totalQuantity,
        firstPurchaseTime: Math.min(...txs.map((tx) => tx.timestamp)),
        lastPurchaseTime: Math.max(...txs.map((tx) => tx.timestamp)),
        purchaseVelocity:
          totalQuantity /
          ((Math.max(...txs.map((tx) => tx.timestamp)) -
            Math.min(...txs.map((tx) => tx.timestamp))) /
            3600000),
      };

      bundles.push(bundle);
    }

    // Sort bundles by supply percentage
    bundles.sort((a, b) => b.supplyPercentage - a.supplyPercentage);

    return {
      mintAddress,
      totalBundles: bundles.length,
      totalSolSpent: bundles.reduce((sum, bundle) => sum + bundle.solSpent, 0),
      totalUniqueWallets: new Set(
        bundles.flatMap((b) => b.transactions.map((t) => t.signature)),
      ).size,
      totalSupply,
      largestBundle: bundles[0] || null,
      bundles,
      suspiciousPatterns: analyzeSuspiciousPatterns(bundles),
    };
  } catch (error) {
    console.error('Error identifying bundles:', error);
    return null;
  }
}

function analyzeSuspiciousPatterns(bundles: Bundle[]) {
  return {
    // Rapid accumulation (potential snipers)
    rapidAccumulation: bundles.filter((b) => {
      const timeWindow = b.lastPurchaseTime - b.firstPurchaseTime;
      const isQuickPurchase = timeWindow < 10000; // Within 10 seconds
      const isLargeAmount = b.supplyPercentage > 1; // Over 1% of supply
      return isQuickPurchase && isLargeAmount;
    }),

    // Price manipulation
    priceManipulation: bundles.filter((b) => {
      const prices = b.transactions.map((t) => t.price);
      const priceVariance = Math.max(...prices) / Math.min(...prices);
      return priceVariance > 2; // Price doubled within the bundle
    }),

    // Coordinated buying (potential snipers working together)
    coordinatedBuying: bundles.filter((b) => 
      b.transactions.length >= 3 && // Multiple transactions
      b.supplyPercentage > 2 && // Significant supply
      (b.lastPurchaseTime - b.firstPurchaseTime) < 30000 // Within 30 seconds
    ),

    // Sniper characteristics
    snipers: bundles.filter((b) => {
      const isEarlyBuyer = b.firstPurchaseTime < Date.now() - (24 * 60 * 60 * 1000); // Within first 24h
      const hasHighVelocity = b.purchaseVelocity > 500; // High tokens/hour
      const isLargeHolder = b.supplyPercentage > 1; // Over 1% of supply
      const quickExecution = (b.lastPurchaseTime - b.firstPurchaseTime) < 15000; // Within 15 seconds

      return isEarlyBuyer && (hasHighVelocity || (isLargeHolder && quickExecution));
    })
  };
}

// Cache the fetch for 5 minutes
export const analyzeMintBundles = cache(
  actionClient
    .schema(BundleDetectionSchema)
    .action(async ({ parsedInput: { mintAddress, minSlotTransactions } }) => {
      try {
        const analysis = await identifyBundlesBySlot(
          mintAddress,
          minSlotTransactions,
        );
        return { success: true, data: analysis };
      } catch (error) {
        return { success: false, error: 'Failed to analyze bundles' };
      }
    }),
);