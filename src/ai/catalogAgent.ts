'use server';

import { callAiGateway } from './aiGateway';

interface CatalogAgentPayload {
  productTitle?: string
  productDescription?: string
  categoryName?: string
}

export async function generateCatalogContent(data: CatalogAgentPayload) {
  const systemPrompt = 'You are a helpful catalog assistant. Generate text for products and a unique slug based on input data.';
  const userMessage = `Generate text for product: ${data.productTitle || ''}, description: ${data.productDescription || ''}, category: ${data.categoryName || ''}. Also generate a unique slug.`;

  try {
    const result = await callAiGateway(systemPrompt, userMessage);
    return { result, error: undefined as string | undefined };
  } catch (err: any) {
    return { result: '', error: err.message || 'Error generating catalog content' };
  }
}