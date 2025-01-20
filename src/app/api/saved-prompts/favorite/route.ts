import { NextRequest, NextResponse } from 'next/server';

import { dbSetFavoritePrompt } from '@/server/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { id, favorite }: { id: string; favorite: boolean } =
      await request.json();

    await dbSetFavoritePrompt({ id, favorite });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status favorite of prompt:', error);
    return NextResponse.json('Failed to update status favorite of prompt', {
      status: 500,
    });
  }
}
