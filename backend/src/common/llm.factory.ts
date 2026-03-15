import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenRouter } from '@langchain/openrouter';

export function createLLM() {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const model = process.env.LLM_MODEL;

  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        modelName: model || 'gpt-4o',
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
        streaming: true,
      });

    case 'gemini':
      return new ChatGoogleGenerativeAI({
        model: model || 'gemini-2.0-flash',
        temperature: 0.7,
        apiKey: process.env.GOOGLE_API_KEY,
        streaming: true,
      });

    case 'openrouter':
      return new ChatOpenRouter(model || 'anthropic/claude-sonnet-4-5', {
        temperature: 0.7,
      });

    case 'anthropic':
    default:
      return new ChatAnthropic({
        model: model || 'claude-sonnet-4-5',
        temperature: 0.7,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        streaming: true,
      });
  }
}