'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { AIAgent } from '@/payload-types'
import type { CategoryAgent } from '../collections/CategoryAgents'
import type { SettingsGlobal } from '../globals/Settings'

async function getCategoryIdsFromUrl(currentUrl: string): Promise<string[]> {
  const pathname = new URL(currentUrl, 'http://localhost').pathname
  const slugs = pathname.split('/').filter(Boolean).reverse()
  if (slugs.length === 0) return []

  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: slugs.length,
    overrideAccess: true,
    where: {
      slug: {
        in: slugs,
      },
    },
  })

  return slugs.flatMap((slug) => {
    const category = docs.find((doc) => doc.slug === slug)
    return category ? [String(category.id)] : []
  })
}

export async function getAgentForContext(
  currentUrl: string,
  categoryId?: string | number | null,
): Promise<AIAgent | null> {
  const payload = await getPayload({ config: configPromise })
  const categoryIds = categoryId
    ? [String(categoryId), ...(await getCategoryIdsFromUrl(currentUrl))]
    : await getCategoryIdsFromUrl(currentUrl)

  for (const id of [...new Set(categoryIds)]) {
    const matchingAgent = await payload.find({
      collection: 'ai-agents',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { isActive: { equals: true } },
          { agentType: { in: ['catalog', 'consultant'] } },
          { categories: { contains: id } },
        ],
      },
    })

    if (matchingAgent.docs[0]) return matchingAgent.docs[0]
  }

  const searchAgents = await payload.find({
    collection: 'ai-agents',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { isActive: { equals: true } },
        { agentType: { equals: 'search' } },
      ],
    },
  })

  return searchAgents.docs[0] ?? null
}

interface AgentInstruction {
  prompt: string
  aiProvider: 'openai' | 'gemini' | 'anthropic'
  apiKey: string
  aiEnabled: boolean
}

export async function getAiAgentInstruction(currentUrl: string, userQuery: string): Promise<AgentInstruction> {
  const payload = await getPayload({ config: configPromise })

  // Получаем настройки через безопасное приведение типов
  const settings = (await payload.findGlobal({
    slug: 'settings' as any,
  })) as unknown as SettingsGlobal;

  const aiSettings = settings?.aiSettings || {};
  const aiProvider = aiSettings.aiProvider || 'openai';
  const apiKey = aiSettings.apiKey || '';
  const aiEnabled = Boolean(aiSettings.aiEnabled);
  const generalKnowledgeBase = aiSettings.generalKnowledgeBase || '';
  const mainSearchAgentPrompt = aiSettings.mainSearchAgentPrompt || '';

  if (!aiEnabled) {
    return { prompt: 'AI features are disabled.', aiProvider, apiKey, aiEnabled: false }
  }

  if (!apiKey) {
    return { prompt: 'API Key is not configured for AI provider.', aiProvider, apiKey, aiEnabled: false }
  }

  // Находим активные категорийные агенты с явным приведением типов
  const categoryAgentsRes = await payload.find({
    collection: 'category-agents' as any,
    where: {
      isActive: {
        equals: true,
      },
    },
  });

  const categoryAgents = (categoryAgentsRes.docs || []) as unknown as CategoryAgent[];

  let finalPrompt = ''
  const selectedAiProvider = aiProvider

  const matchingAgent = categoryAgents.find(agent =>
    agent.activeRoutes?.some((route: { route: string }) => currentUrl.startsWith(route.route)),
  )

  if (matchingAgent) {
    // Используем специфичный промпт агента
    finalPrompt = `You are a ${matchingAgent.name}. Your role is: ${matchingAgent.systemPrompt}.\n\n`
    if (generalKnowledgeBase) {
      finalPrompt += `General Store Knowledge: ${generalKnowledgeBase}\n\n`
    }
    if (matchingAgent.specificKnowledgeBase) {
      finalPrompt += `Specific Knowledge: ${matchingAgent.specificKnowledgeBase}\n\n`
    }
    finalPrompt += `User Query: ${userQuery}`
    console.log(`Using Category Agent: ${matchingAgent.name}`)
  } else {
    // Фоллбэк на основной поисковый агент
    finalPrompt = `You are the main search and recommendation agent. Your role is: ${mainSearchAgentPrompt}.\n\n`
    if (generalKnowledgeBase) {
      finalPrompt += `General Store Knowledge: ${generalKnowledgeBase}\n\n`
    }
    finalPrompt += `User Query: ${userQuery}`
    console.log('Using Main Search Agent (no specific agent found).')
  }

  return { prompt: finalPrompt, aiProvider: selectedAiProvider, apiKey, aiEnabled: true }
}