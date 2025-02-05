'use client';

import { useState } from 'react';

import {
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  LocateFixed,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type BundleAnalysisResponse } from '@/types/bundle';

interface BundleListProps {
  bundles: BundleAnalysisResponse['bundles'];
}

const MAX_BUNDLES = 3;
const ADDITIONAL_BUNDLES = 4;

export function BundleList({ bundles }: BundleListProps) {
  const [visibleBundles, setVisibleBundles] = useState(MAX_BUNDLES);
  const bundleEntries = Object.entries(bundles || {});
  const hasMoreBundles = bundleEntries.length > visibleBundles;
  const canShowLess = visibleBundles > MAX_BUNDLES;

  return (
    <div className="space-y-2">
      {bundles &&
        Object.entries(bundles)
          .slice(0, visibleBundles)
          .map(([address, bundle], _index) => (
            <div key={address} className="rounded-lg bg-muted p-4">
              <h1 className="pb-3 text-center font-semibold underline">
                BUNDLE {_index + 1}
              </h1>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Unique Wallets</p>
                  <p className="font-medium">{bundle.unique_wallets}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Tokens</p>
                  <p className="font-medium">
                    {bundle.total_tokens.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total SOL Spent</p>
                  <p className="font-medium">
                    {bundle.total_sol.toFixed(2)} SOL
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Token Percentage</p>
                  <p className="font-medium">
                    {bundle.token_percentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holding Percentage</p>
                  <p className="font-medium">
                    {bundle.holding_percentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holding Amount</p>
                  <p className="font-medium">
                    {bundle.holding_amount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="mt-4">
                <p className="mb-2 font-medium">Wallet Info</p>
                <div className="space-y-2">
                  {Object.entries(bundle.wallet_info).map(([wallet, info]) => (
                    <div key={wallet} className="rounded bg-background/50 p-2">
                      <div className="flex items-center justify-between">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="max-w-8 truncate text-xs">
                                {wallet}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{wallet}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {bundle.wallet_categories?.[wallet] === 'sniper' ? (
                          <LocateFixed className="size-4" />
                        ) : (
                          <CircleUserRound className="size-4" />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>
                          Bought: {info.tokens.toLocaleString()} (
                          {info.token_percentage.toFixed(2)}%)
                        </p>
                        <p>
                          SOL Spent: {info.sol.toFixed(2)} SOL (
                          {info.sol_percentage.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

      {(hasMoreBundles || canShowLess) && (
        <div className="flex justify-center gap-2 pt-4">
          {canShowLess && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleBundles(MAX_BUNDLES)}
              className="flex items-center gap-2"
            >
              Show Less
              <ChevronUp className="size-4" />
            </Button>
          )}
          {hasMoreBundles && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setVisibleBundles((prev) => prev + ADDITIONAL_BUNDLES)
              }
              className="flex items-center gap-2"
            >
              Show More
              <ChevronDown className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
