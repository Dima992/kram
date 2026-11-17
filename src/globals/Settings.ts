import { GlobalConfig } from 'payload'

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
  label: 'Settings',
  fields: [
    {
      name: 'siteName',
      label: 'Site Name',
      type: 'text',
      required: true,
    },
    {
      name: 'aiSettings',
      label: 'AI Settings',
      type: 'group',
      admin: {
        hidden: true,
      },
      fields: [
        {
          name: 'aiProvider',
          label: 'AI Provider',
          type: 'select',
          options: ['openai', 'gemini', 'anthropic'],
          defaultValue: 'openai',
        },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
        },
        {
          name: 'aiEnabled',
          label: 'Enable AI Features',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}