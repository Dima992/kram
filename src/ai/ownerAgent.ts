'use server';

import { callAiGateway } from './aiGateway';

export async function ownerAgent(input: string | { userQuery: string }) {
  const query = typeof input === 'string' ? input : input.userQuery;
  const systemPrompt = 'You are the store owner assistant. Help manage business operations, analytics, and strategy.';
  
  try {
    const result = await callAiGateway(systemPrompt, query);
    return { result };
  } catch (err: any) {
    return { error: err.message || 'Error executing Owner Agent' };
  }
}

export const getOwnerAgentResponse = ownerAgent;