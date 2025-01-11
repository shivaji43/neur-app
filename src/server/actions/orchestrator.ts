import { CoreMessage, LanguageModelUsage, generateObject } from 'ai';
import _ from 'lodash';
import { z } from 'zod';

import { defaultModel, orchestrationPrompt } from '@/ai/providers';

export async function getToolsFromOrchestrator(
  messages: CoreMessage[] | undefined,
): Promise<{ usage: LanguageModelUsage; toolsets: string[] | undefined }> {
  const { object: toolsets, usage } = await generateObject({
    model: defaultModel,
    system: orchestrationPrompt,
    output: 'array',
    schema: z
      .string()
      .describe(
        'The toolset name, describing a group of tools needed to handle the user request.',
      ),
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'generate-object',
    },
    messages,
  });

  if (toolsets.length === 0) {
    return { usage, toolsets: undefined };
  } else {
    return { usage, toolsets };
  }
}
