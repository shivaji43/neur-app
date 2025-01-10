import { CoreMessage, CoreTool, generateText } from 'ai';
import _ from 'lodash';
import { z } from 'zod';

import {
  coreTools,
  defaultModel,
  orchestrationPrompt,
  toolsets,
} from '@/ai/providers';
import { sanitizeResponseMessages } from '@/lib/utils/ai';

export async function getToolsFromOrchestrator(
  messages: CoreMessage[] | undefined,
): Promise<string[] | undefined> {
  const { response } = await generateText({
    model: defaultModel,
    system: orchestrationPrompt,
    tools: {
      determineToolsets: {
        description: `Determine which toolsets to use based on the user message. Available Toolsets:
${Object.entries(toolsets)
  .map(([name, { description }]) => `  - **${name}**: ${description}`)
  .join('\n')}`,
        parameters: z.object({
          toolsets: z.array(z.string()),
        }),
      },
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
    },
    maxSteps: 15,
    messages,
  });

  const sanitizedResponses = sanitizeResponseMessages(response.messages);

  console.log(sanitizedResponses);

  if (sanitizedResponses.length === 0) {
    console.log('[orchestrator] No toolsets found');
    return undefined;
  }

  try {
    console.log(
      '[orchestrator] sanitizedResponses',
      console.dir(sanitizedResponses),
    );
    const toolsetMessage = sanitizedResponses[0].content[0] as {
      type: string;
      text: string;
    };
    console.log('[orchestrator] toolsetMessage', toolsetMessage);
    const toolsets = JSON.parse(toolsetMessage.text) as string[];

    return toolsets;
  } catch (error) {
    console.error('[orchestrator] Failed to parse toolsets', error);
    return undefined;
  }
}
