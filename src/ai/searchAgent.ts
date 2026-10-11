'use server';

import { callAiGateway } from './aiGateway';

export async function searchAgent(input: string | { userQuery: string; productCatalog?: any[] }) {
  const query = typeof input === 'string' ? input : input.userQuery;
  const systemPrompt = 'You are the main search and recommendation agent for the online store.';
  
  try {
    const result = await callAiGateway(systemPrompt, query);
    return { result, error: undefined };
  } catch (err: any) {
    return { result: '', error: err.message || 'Error in search agent' };
  }
}

export const getSearchRecommendations = searchAgent;