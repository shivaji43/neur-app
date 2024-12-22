import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const hasClaude = !!process.env.ANTHROPIC_API_KEY;

const openai = createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const claude35Sonnet = anthropic('claude-3-5-sonnet-20241022');
const gpt4oMini = openai('gpt-4o');

export const defaultModel = hasClaude ? claude35Sonnet : gpt4oMini;

