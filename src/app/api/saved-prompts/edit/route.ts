import { NextRequest, NextResponse } from 'next/server';

import { dbUpdateSavedPrompt } from '@/server/db/queries';

export async function POST(request: NextRequest) {
  try {
    const {
      id,
      title,
      content,
    }: { id: string; title: string; content: string } = await request.json();

    await dbUpdateSavedPrompt({ id, title, content });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error editing the prompt:', error);
    return NextResponse.json('Failed to edit prompt', {
      status: 500,
    });
  }
}
