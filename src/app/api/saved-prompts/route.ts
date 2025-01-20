import { NextRequest, NextResponse } from 'next/server';

import { verifyUser } from '@/server/actions/user';
import {
  dbCreateSavedPrompt,
  dbDeleteSavedPrompt,
  dbGetSavedPrompts,
} from '@/server/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { title, content, userId } = await request.json();
    const savedPrompt = await dbCreateSavedPrompt({ userId, title, content });
    return NextResponse.json(savedPrompt, { status: 200 });
  } catch (error) {
    console.error('Error saving the prompt:', error);
    return NextResponse.json('Failed to save prompt', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyUser();
    const userId = session?.data?.data?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    await dbDeleteSavedPrompt({ id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting a saved prompt:', error);
    return NextResponse.json(
      { error: 'Failed to delete a saved prompt' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await verifyUser();
    const userId = session?.data?.data?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const savedPrompts = await dbGetSavedPrompts({ userId });
    return NextResponse.json(savedPrompts);
  } catch (error) {
    console.error('Error fetching saved prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved prompts' },
      { status: 500 },
    );
  }
}
