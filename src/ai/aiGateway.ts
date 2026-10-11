'use server';

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import configPromise from '@payload-config';
import OpenAI from 'openai';
import { getPayload } from 'payload';
import { SettingsGlobal } from '../globals/Settings';

export async function callAiGateway(systemPrompt: string, userMessage: string): Promise<string> {
  const payload = await getPayload({ config: configPromise });

  const settings = (await payload.findGlobal({
    slug: 'settings' as any,
  })) as unknown as SettingsGlobal;

  const aiSettings = settings?.aiSettings || {};
  if (!aiSettings.aiEnabled || !aiSettings.apiKey) {
    return 'AI features are disabled or API key is missing.';
  }

  const aiProvider = aiSettings.aiProvider || 'openai';
  const apiKey = aiSettings.apiKey;

  switch (aiProvider) {
    case 'openai': {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      return completion.choices[0]?.message?.content || 'No response from OpenAI.';
    }
    case 'gemini': {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\n${userMessage}`);
      const response = await result.response;
      return response.text() || 'No response from Gemini.';
    }
    case 'anthropic': {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const first = response.content[0];
      return first && 'text' in first ? first.text : 'No response from Anthropic.';
    }
    default:
      return 'Unsupported AI provider.';
  }
}