import { CollectionConfig } from 'payload';

export interface CategoryAgent {
  id: string;
  name: string;
  slug: string;
  activeRoutes: Array<{ route: string }>;
  systemPrompt: string;
  specificKnowledgeBase?: string;
  isActive: boolean;
}

export const CategoryAgents: CollectionConfig<any> = {
  slug: 'category-agents',
  admin: {
    useAsTitle: 'name',
    description: 'Define specialized AI agents for different categories or sections of the site.',
  },
  fields: [
    {
      name: 'name',
      label: 'Agent Name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Agent Slug / Category Identifier',
      type: 'text',
      unique: true,
      admin: {
        description: 'Unique identifier for this agent, or a direct link to a category slug.',
      },
    },
    {
      name: 'activeRoutes',
      label: 'Active Routes (URL Prefixes)',
      type: 'array',
      fields: [
        {
          name: 'route',
          label: 'URL Prefix / Route',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g., /catalog/women, /blog/ai. This agent will activate on pages matching this prefix.',
          },
        },
      ],
      admin: {
        description: 'List of URL prefixes where this agent should be active.',
      },
    },
    {
      name: 'systemPrompt',
      label: 'Agent System Prompt',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Specific system prompt defining the role and behavior of this agent.',
      },
    },
    {
      name: 'specificKnowledgeBase',
      label: 'Specific Knowledge Base',
      type: 'textarea',
      admin: {
        description: 'Narrowly focused knowledge base for this agent (e.g., sizes, compositions, care recommendations).',
      },
    },
    {
      name: 'isActive',
      label: 'Is Agent Active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Toggle to activate or deactivate this category agent.',
      },
    },
  ],
};