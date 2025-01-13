import { CoreTool, NoSuchToolError, generateObject, generateText } from 'ai';
import _ from 'lodash';
import { SolanaAgentKit } from 'solana-agent-kit';
import { z } from 'zod';

import {
  defaultModel,
  defaultSystemPrompt,
  defaultTools,
  getToolsFromRequiredTools,
} from '@/ai/providers';
import { RPC_URL } from '@/lib/constants';
import prisma from '@/lib/prisma';
import { decryptPrivateKey } from '@/lib/solana/wallet-generator';
import { sanitizeResponseMessages } from '@/lib/utils/ai';
import { ActionWithUser } from '@/types/db';

import { dbCreateMessages, dbCreateTokenStat, dbGetConversation } from '../db/queries';
import { getToolsFromOrchestrator } from './orchestrator';
import { isValidTokenUsage } from '@/lib/utils';

export async function processAction(action: ActionWithUser) {
  console.log(
    `[action:${action.id}] Processing action ${action.id} with prompt "${action.description}"`,
  );

  try {
    const conversation = await dbGetConversation({
      conversationId: action.conversationId,
    });

    if (!conversation) {
      console.error(
        `[action:${action.id}] Conversation ${action.conversationId} not found`,
      );
      return;
    }

    // Get user wallet
    const publicKey = action.user.wallets[0].publicKey;

    // append to system prompt
    const systemPrompt =
      defaultSystemPrompt + `\n\nUser Solana wallet public key: ${publicKey}`;

    // WARNING: This attaches the user's private key to the agent kit

    // Clone tools and attach user agent kit
    const privateKey = await decryptPrivateKey(
      action.user.wallets[0].encryptedPrivateKey,
    );
    const openaiKey = process.env.OPENAI_API_KEY!;
    const agent = new SolanaAgentKit(privateKey, RPC_URL, openaiKey);
    
    // Run messages through orchestration
    const { toolsRequired, usage: orchestratorUsage } =
    await getToolsFromOrchestrator([{
      role: 'user',
      content: action.description,
    }]);

    console.log('[action:${action.id}] toolsRequired', toolsRequired);

    const tools = toolsRequired
      ? getToolsFromRequiredTools(toolsRequired)
      : defaultTools;

    const clonedTools = _.cloneDeep(tools);
    for (const toolName in clonedTools) {
      const tool = clonedTools[toolName as keyof typeof clonedTools];
      clonedTools[toolName as keyof typeof clonedTools] = {
        ...tool,
        agentKit: agent,
        userId: action.userId,
      };
    }

    // Remove createAction from tools, prevent recursive action creation
    delete tools.createAction;

    // Call the AI model
    const { response, usage } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      tools: clonedTools as Record<string, CoreTool<any, any>>,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'generate-text',
      },
      experimental_repairToolCall: async ({
        toolCall,
        tools,
        parameterSchema,
        error,
      }) => {
        if (NoSuchToolError.isInstance(error)) {
          return null;
        }

        console.log('[action:${action.id}] repairToolCall', toolCall);

        const tool = tools[toolCall.toolName as keyof typeof tools];
        const { object: repairedArgs } = await generateObject({
          model: defaultModel,
          schema: tool.parameters as z.ZodType<any>,
          prompt: [
            `The model tried to call the tool "${toolCall.toolName}"` +
              ` with the following arguments:`,
            JSON.stringify(toolCall.args),
            `The tool accepts the following schema:`,
            JSON.stringify(parameterSchema(toolCall)),
            'Please fix the arguments.',
          ].join('\n'),
        });

        console.log('[action:${action.id}] repairedArgs', repairedArgs);
        console.log('[action:${action.id}] toolCall', toolCall);

        return { ...toolCall, args: JSON.stringify(repairedArgs) };
      },

      maxSteps: 15,
      prompt: action.description,
    });

    const sanitizedResponses = sanitizeResponseMessages(response.messages);
    const messages = await dbCreateMessages({
      messages: sanitizedResponses.map((message) => {
        return {
          conversationId: action.conversationId,
          role: message.role,
          content: JSON.parse(JSON.stringify(message.content)),
        };
      }),
    });
    
    // Save the token stats
    if (messages && isValidTokenUsage(usage)) {
      const messageIds = messages.map((message) => message.id);
      let { promptTokens, completionTokens, totalTokens } = usage;

      // Attach orchestrator usage
      if (isValidTokenUsage(orchestratorUsage)) {
        promptTokens += orchestratorUsage.promptTokens;
        completionTokens += orchestratorUsage.completionTokens;
        totalTokens += orchestratorUsage.totalTokens;
      }

      await dbCreateTokenStat({
        userId: action.userId,
        messageIds,
        promptTokens,
        completionTokens,
        totalTokens,
      });
    }
  } catch (error) {
    console.error(
      `[action:${action.id}] Failed to process action ${action.id}`,
      error,
    );
  } finally {
    // TODO: maybe don't update if the action failed?
    // Increment the action's execution count and state
    await prisma.action.update({
      where: { id: action.id },
      data: {
        timesExecuted: {
          increment: 1,
        },
        lastExecutedAt: new Date(),
        ...(action.maxExecutions && {
          completed: action.timesExecuted + 1 >= action.maxExecutions,
        }),
      },
    });
  }
}
