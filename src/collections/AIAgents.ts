import { adminOnly } from '@/access/adminOnly'
import type { CollectionConfig } from 'payload'

export const AIAgents: CollectionConfig = {
  slug: 'ai-agents',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'ИИ Модуль',
    useAsTitle: 'name',
    description: 'Управление ИИ-агентами магазина.',
  },
  labels: {
    singular: 'Агент',
    plural: 'Управление Агентами',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Название агента',
    },
    {
      name: 'systemKey',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Активен',
    },
    {
      name: 'agentType',
      type: 'select',
      required: true,
      label: 'Тип агента',
      options: [
        { label: 'Каталог', value: 'catalog' },
        { label: 'Поиск', value: 'search' },
        { label: 'Консультант', value: 'consultant' },
        { label: 'Владелец', value: 'owner' },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      label: 'Категории',
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      label: 'Инструкция агента',
    },
    {
      name: 'knowledgeBase',
      type: 'textarea',
      label: 'База знаний агента',
      admin: {
        description: 'Индивидуальные данные и знания, доступные только этому агенту.',
      },
    },
    {
      name: 'defaultQuestions',
      type: 'array',
      label: 'Вопросы по умолчанию',
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          label: 'Вопрос',
        },
      ],
    },
    {
      name: 'provider',
      type: 'select',
      label: 'Провайдер',
      options: [
        { label: 'Gemini', value: 'gemini' },
        { label: 'OpenAI', value: 'openai' },
      ],
    },
    {
      name: 'model',
      type: 'text',
      label: 'Модель',
    },
  ],
}

export const builtInAIAgents = [
  {
    systemKey: 'built-in-search',
    name: 'Поисковый агент',
    agentType: 'search' as const,
    systemPrompt: 'Помогай покупателям искать товары и выбирать подходящие варианты.',
  },
  {
    systemKey: 'built-in-owner',
    name: 'Агент владельца',
    agentType: 'owner' as const,
    systemPrompt: 'Помогай владельцу магазина анализировать работу и развитие магазина.',
  },
]
