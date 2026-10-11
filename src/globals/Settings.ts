import { GlobalConfig } from 'payload';

export interface SettingsGlobal {
  siteName: string;
  aiSettings: {
    aiProvider: 'openai' | 'gemini' | 'anthropic';
    apiKey?: string;
    catalogAgentPrompt?: string;
    searchAgentPrompt?: string;
    aiEnabled?: boolean;
    generalKnowledgeBase?: string;
    mainSearchAgentPrompt?: string;
    ownerAgentPrompt?: string;
  };
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
      fields: [
        {
          name: 'aiProvider',
          label: 'AI Provider',
          type: 'select',
          options: ['openai', 'gemini', 'anthropic'],
          defaultValue: 'openai',
          admin: {
            description: 'Choose your preferred AI provider.',
          },
        },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'text',
          admin: {
            description: 'This is your API key for the selected AI provider. It grants access to AI services. Please refer to your AI provider\'s documentation for instructions on how to obtain this key.',
          },
        },
        {
          name: 'catalogAgentPrompt',
          label: 'Catalog Agent System Prompt',
          type: 'textarea',
          admin: {
            description: 'The system prompt for the Catalog Agent, used for generating product texts, slugs, and working with categories.',
          },
        },
        {
          name: 'searchAgentPrompt',
          label: 'Search Agent System Prompt',
          type: 'textarea',
          admin: {
            description: 'The system prompt for the Search Agent, used for frontend search and product recommendations.',
          },
        },
        {
          name: 'aiEnabled',
          label: 'Enable AI Features',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Enable or disable AI-powered features across the site.',
          },
        },
        {
          name: 'generalKnowledgeBase',
          label: 'General Knowledge Base',
          type: 'textarea',
          admin: {
            description: 'General information about the store (payment, delivery, warranty, contacts, return policy) used by ALL AI agents.',
          },
        },
        {
          name: 'mainSearchAgentPrompt',
          label: 'Main Search Agent System Prompt',
          type: 'textarea',
          admin: {
            description: 'System prompt for the Main Search Agent, used when no specific category agent is active.',
          },
        },
        {
          name: 'ownerAgentPrompt',
          label: 'Business Owner Agent System Prompt',
          type: 'textarea',
          admin: {
            description: 'System prompt for the Business Owner / Analytics Agent, providing advice on assortment, marketing, and conversion.',
          },
        },
      ],
    },
  ],
}
