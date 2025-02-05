import { NextResponse } from 'next/server';

import { analyzeMintBundles } from '@/server/actions/bundle';

export async function GET(request: Request) {
  const analysis = await analyzeMintBundles({
    mintAddress: '2raD5gpz5Qid2CxLQKWaJdCcAcp74BseGdSA5r1bpump',
    minSlotTransactions: 2,
  });
  return NextResponse.json(analysis);
}
