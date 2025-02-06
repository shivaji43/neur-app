import { z } from 'zod';

import { analyzeMintBundles } from '@/server/actions/bundle';
import { type BundleAnalysisResponse } from '@/types/bundle';

import { BundleList } from './bundle-list';

export const bundleTools = {
  analyzeBundles: {
    displayName: '🔍 Analyze Mint Bundles',
    isCollapsible: true,
    description:
      'Analyze potential bundles and snipers for a given mint address.',
    parameters: z.object({
      mintAddress: z.string().describe("The token's mint address"),
    }),
    execute: async ({ mintAddress }: { mintAddress: string }) => {
      try {
        const analysis = await analyzeMintBundles({ mintAddress });

        if (!analysis || !analysis.data) {
          return {
            success: false,
            error: 'No data available',
          };
        }

        return { success: true, data: analysis.data };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to analyze bundles',
        };
      }
    },
    render: (result: unknown) => {
      const typedResult = result as {
        success: boolean;
        data?: { data: BundleAnalysisResponse };
        error?: string;
      };

      if (!typedResult.success || !typedResult.data?.data) {
        return (
          <div className="relative overflow-hidden rounded-2xl bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-destructive">
                Error: {typedResult.error || 'No data available'}
              </p>
            </div>
          </div>
        );
      }

      const analysis = typedResult.data.data;

      const initalSummary = analysis
        ? [
            {
              name: 'Ticker',
              value: analysis.ticker.toUpperCase(),
            },
            {
              name: 'Total Bundles',
              value: analysis.total_bundles,
            },
            {
              name: 'Total SOL Spent',
              value: `${analysis.total_sol_spent.toFixed(2)} SOL`,
            },
            {
              name: 'Bundled Total',
              value: `${analysis.total_percentage_bundled.toFixed(2)}%`,
            },
            {
              name: 'Held Percentage',
              value: `${analysis.total_holding_percentage.toFixed(2)}%`,
            },
            {
              name: 'Held Tokens',
              value: analysis.total_holding_amount.toLocaleString(),
            },
            {
              name: 'Bonded',
              value: analysis.bonded ? 'Yes' : 'No',
            },
          ]
        : [];

      return (
        <div className="space-y-4">
          {/* Initial Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="mx-auto grid grid-cols-2 gap-4 text-sm">
              {initalSummary.map(({ name, value }, index) => (
                <div key={index}>
                  <p className="text-muted-foreground">{name}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bundle Details */}
          <BundleList bundles={analysis.bundles} />
        </div>
      );
    },
  },
};
