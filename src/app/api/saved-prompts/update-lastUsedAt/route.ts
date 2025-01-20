import { NextRequest, NextResponse } from 'next/server';

import { verifyUser } from '@/server/actions/user';
import { dbUpdatePromptLastUsedAt } from '@/server/db/queries';

export async function POST(request: NextRequest) {
  try {
    const session = await verifyUser();
    const userId = session?.data?.data?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id }: { id: string } = await request.json();

    const prompt = await dbUpdatePromptLastUsedAt({ id });
    return NextResponse.json(prompt, { status: 200 });
  } catch (error) {
    console.error('Error editing -lastUsedAt- for prompt:', error);
    return NextResponse.json('Failed to edit -lastUsedAt- for prompt', {
      status: 500,
    });
  }
}
