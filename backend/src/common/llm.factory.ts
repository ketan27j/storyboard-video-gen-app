import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

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
      return new ChatOpenAI({
        modelName: model || 'anthropic/claude-3.5-sonnet',
        temperature: 0.7,
        openAIApiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_SITE_NAME || 'Storyboard App',
          },
        },
        streaming: true,
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