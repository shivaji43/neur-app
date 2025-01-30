import { z } from 'zod';


export interface BundleTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  price: number;
  quantity: number;
  buyer?: string;
}

export interface Bundle {
  slot: number;
  bundleAddress: string;
  transactions: BundleTransaction[];
  supplyPercentage: number;
  solSpent: number;
  currentHoldings: number;
  isPumpfunBundle: boolean;
  avgPricePerToken: number;
  firstPurchaseTime: number;
  lastPurchaseTime: number;
  purchaseVelocity: number; // tokens per hour during active period
  uniqueBuyers: number;
}

export interface MintBundleAnalysis {
  mintAddress: string;
  totalBundles: number;
  totalSolSpent: number;
  totalUniqueWallets: number;
  totalSupply: number;
  largestBundle: Bundle | null;
  bundles: Bundle[];
  suspiciousPatterns: {
    rapidAccumulation: Bundle[];
    priceManipulation: Bundle[];
    coordinatedBuying: Bundle[];
    snipers: Bundle[];
  };
}

export const BundleAnalysisSchema = z.object({
  mintAddress: z.string(),
  timeframe: z.enum(['1h', '24h', '7d', '30d', 'all']).optional(),
  minSupplyPercentage: z.number().min(0).max(100).optional(),
});

export const BundleDetectionSchema = z.object({
  mintAddress: z.string(),
  timeframe: z.enum(['1h', '24h', '7d', '30d', 'all']).optional(),
  minSlotTransactions: z.number().min(2).default(2).optional(),
  minSupplyPercentage: z.number().min(0).max(100).optional(),
});