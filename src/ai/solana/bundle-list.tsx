'use client';

import { useState } from 'react';

import {
  ChevronLeft,
  ChevronRight,
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

function BundleCard({ bundle, index }: { bundle: any; index: number }) {
  const stats = [
    { name: 'Unique Wallets', value: bundle.unique_wallets },
    { name: 'Total Tokens', value: bundle.total_tokens.toLocaleString() },
    { name: 'Total SOL Spent', value: `${bundle.total_sol.toFixed(2)} SOL` },
    {
      name: 'Token Percentage',
      value: `${bundle.token_percentage.toFixed(2)}%`,
    },
    {
      name: 'Holding Percentage',
      value: `${bundle.holding_percentage.toFixed(2)}%`,
    },
    { name: 'Holding Amount', value: bundle.holding_amount.toLocaleString() },
  ];

  return (
    <div className="rounded-lg bg-muted p-4">
      <h1 className="pb-3 text-center font-semibold underline">
        BUNDLE {index + 1}
      </h1>

      {/* Bundle Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {stats.map(({ name, value }) => (
          <div key={name}>
            <p className="text-muted-foreground">{name}</p>
            <p className="font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Wallet Info */}
      <div className="mt-4">
        <p className="mb-2 font-medium">Wallet Info</p>
        <div className="space-y-2">
          {Object.entries(bundle.wallet_info).map(
            ([wallet, info]: [string, any]) => (
              <div key={wallet} className="rounded bg-background/50 p-2">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="w-48 overflow-hidden">
                        <div className="truncate text-xs">{wallet}</div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{wallet}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="ml-auto">
                    {bundle.wallet_categories?.[wallet] === 'sniper' ? (
                      <LocateFixed className="size-4" />
                    ) : (
                      <CircleUserRound className="size-4" />
                    )}
                  </div>
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
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function BundleList({ bundles }: BundleListProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const bundleEntries = Object.entries(bundles || {});
  const totalPages = bundleEntries.length;

  return (
    <div className="space-y-4">
      {bundleEntries.map(([address, bundle], index) => {
        if (index !== currentPage) return null;
        return <BundleCard key={address} bundle={bundle} index={index} />;
      })}

      {totalPages > 1 && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="w-28 flex items-center justify-center gap-1"
          >
            <ChevronLeft className="size-4" />
            <span>Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
            disabled={currentPage >= totalPages - 1}
            className="w-28 flex items-center justify-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
