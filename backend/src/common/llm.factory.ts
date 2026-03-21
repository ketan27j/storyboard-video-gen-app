import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenRouter } from '@langchain/openrouter';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenAI } from '@google/genai';

export async function createLLM() {
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
      // Use ChatVertexAI for direct Vertex AI integration
      return new ChatVertexAI({
        model: model || 'gemini-2.5-flash-lite',
        location: process.env.GOOGLE_LOCATION || 'us-central1',
        temperature: 0.7,
        maxOutputTokens: 1024,
        streaming: true,
        authOptions: {
          projectId: process.env.GOOGLE_PROJECT_ID,
        },
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