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
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Активен',
    },
    {
      name: 'agentType',
      type: 'select',
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
