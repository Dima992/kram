import { adminOnly } from '@/access/adminOnly'
import type { GlobalConfig } from 'payload'

export const AISettings: GlobalConfig = {
  slug: 'ai-settings',
  label: 'Настройки ИИ',
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  admin: {
    group: 'ИИ Модуль',
  },
  fields: [
    {
      name: 'aiEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'Включить ИИ',
    },
    {
      name: 'geminiApiKey',
      type: 'text',
      label: 'Ключ API Gemini',
    },
    {
      name: 'openaiApiKey',
      type: 'text',
      label: 'Ключ API OpenAI',
    },
  ],
}
