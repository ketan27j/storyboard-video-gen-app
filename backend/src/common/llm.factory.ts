import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';

export function createLLM() {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-5';

  if (provider === 'openai') {
    return new ChatOpenAI({
      modelName: model || 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      streaming: true,
    });
  }

  return new ChatAnthropic({
    model,
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    streaming: true,
  });
}
