import { GlobalConfig } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

export interface SettingsGlobal {
  siteName: string
  aiSettings: {
    aiProvider: 'openai' | 'gemini' | 'anthropic'
    apiKey?: string
    aiEnabled?: boolean
  }
}

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: adminLabel('Налаштування', 'Настройки'),
  fields: [
    {
      name: 'siteName',
      label: adminLabel('Назва сайту', 'Название сайта'),
      type: 'text',
      required: true,
    },
    {
      name: 'aiSettings',
      label: adminLabel('Налаштування ШІ', 'Настройки ИИ'),
      type: 'group',
      admin: {
        hidden: true,
      },
      fields: [
        {
          name: 'aiProvider',
          label: adminLabel('Постачальник ШІ', 'Поставщик ИИ'),
          type: 'select',
          options: ['openai', 'gemini', 'anthropic'],
          defaultValue: 'openai',
        },
        {
          name: 'apiKey',
          label: adminLabel('Ключ API', 'Ключ API'),
          type: 'text',
        },
        {
          name: 'aiEnabled',
          label: adminLabel('Увімкнути функції ШІ', 'Включить функции ИИ'),
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
