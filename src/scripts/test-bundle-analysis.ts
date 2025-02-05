import { analyzeMintBundles } from '@/server/actions/bundle';

async function testBundleAnalysis() {
  // Test tokens - add more as needed
  const testTokens = [
    {
      name: 'Example Token 1',
      address: '7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs',
    },
    {
      name: 'BONK',
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    },
  ];

  for (const token of testTokens) {
    console.log(`\n🔍 Analyzing ${token.name} (${token.address})`);
    console.log('='.repeat(50));

    try {
      const analysis = await analyzeMintBundles({
        mintAddress: token.address,
        minSlotTransactions: 2,
      });

      if (!analysis.success || !analysis.data) {
        console.log(`❌ Failed to analyze ${token.name}`);
        continue;
      }

      const data = analysis.data;

      console.log('\n📊 Summary:');
      console.log(`Total Bundles: ${data.totalBundles}`);
      console.log(`Total SOL Spent: ${data.totalSolSpent.toFixed(2)} SOL`);
      console.log(`Unique Wallets: ${data.totalUniqueWallets}`);

      console.log('\n🚨 Suspicious Patterns:');
      console.log(
        `Rapid Accumulation: ${data.suspiciousPatterns.rapidAccumulation.length}`,
      );
      console.log(
        `Price Manipulation: ${data.suspiciousPatterns.priceManipulation.length}`,
      );
      console.log(
        `Coordinated Buying: ${data.suspiciousPatterns.coordinatedBuying.length}`,
      );
      console.log(
        `Potential Snipers: ${data.suspiciousPatterns.snipers.length}`,
      );

      if (data.largestBundle) {
        console.log('\n🏆 Largest Bundle:');
        console.log(
          `Supply %: ${data.largestBundle.supplyPercentage.toFixed(2)}%`,
        );
        console.log(`SOL Spent: ${data.largestBundle.solSpent.toFixed(2)} SOL`);
        console.log(`Transactions: ${data.largestBundle.transactions.length}`);
      }
    } catch (error) {
      console.error(`Error analyzing ${token.name}:`, error);
    }
  }
}

// Run the test
testBundleAnalysis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
