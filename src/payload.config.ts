import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { s3Storage } from '@payloadcms/storage-s3'
import { ru } from '@payloadcms/translations/languages/ru'
import { uk } from '@payloadcms/translations/languages/uk'

import {
  BoldFeature,
  EXPERIMENTAL_TableFeature,
  IndentFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  UnderlineFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { ApiKeys } from '@/collections/ApiKeys'
import { AIAgents, builtInAIAgents } from '@/collections/AIAgents'
import { Categories } from '@/collections/Categories'
import { CategoryAgents } from '@/collections/CategoryAgents'
import { Feeds } from '@/collections/Feeds'
import { ImportSources } from '@/collections/ImportSources'
import { Media } from '@/collections/Media'
import { Pages } from '@/collections/Pages'
import { Users } from '@/collections/Users'
import OwnerAgentChatWidget from '@/components/admin/OwnerAgentChatWidget'
import { Footer } from '@/globals/Footer'
import { Header } from '@/globals/Header'
import { AISettings } from '@/globals/AISettings'
import { Settings } from '@/globals/Settings'
import { SiteSettings } from '@/globals/SiteSettings'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  onInit: async (payload) => {
    for (const agent of builtInAIAgents) {
      const existingAgent = await payload.find({
        collection: 'ai-agents',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          systemKey: {
            equals: agent.systemKey,
          },
        },
      })

      if (existingAgent.docs.length === 0) {
        await payload.create({
          collection: 'ai-agents',
          data: {
            ...agent,
            isActive: true,
            provider: 'gemini',
            model: 'gemini-2.5-flash',
          },
          overrideAccess: true,
        })
      }
    }
  },
  admin: {
    components: {
      beforeLogin: ['@/components/BeforeLogin#BeforeLogin'],
      beforeDashboard: ['@/components/BeforeDashboard#BeforeDashboard'],
      afterDashboard: [OwnerAgentChatWidget as any],
    },
    user: Users.slug,
  },

  // 1. Локализация контента в БД
  localization: {
    locales: [
      {
        code: 'uk',
        label: 'Українська',
      },
      {
        code: 'ru',
        label: 'Русский',
      },
    ],
    defaultLocale: 'uk',
    fallback: true,
  },

  // 2. Язык интерфейса админки
  i18n: {
    supportedLanguages: { uk, ru },
    fallbackLanguage: 'uk',
  },

  collections: [Users, Pages, Categories, Media, Feeds, ImportSources, ApiKeys, CategoryAgents, AIAgents],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  editor: lexicalEditor({
    features: () => {
      return [
        UnderlineFeature(),
        BoldFeature(),
        ItalicFeature(),
        OrderedListFeature(),
        UnorderedListFeature(),
        LinkFeature({
          enabledCollections: ['pages'],
          fields: ({ defaultFields }) => {
            const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
              if ('name' in field && field.name === 'url') return false
              return true
            })

            return [
              ...defaultFieldsWithoutUrl,
              {
                name: 'url',
                type: 'text',
                admin: {
                  condition: ({ linkType }) => linkType !== 'internal',
                },
                label: ({ t }) => t('fields:enterURL'),
                required: true,
              },
            ]
          },
        }),
        IndentFeature(),
        EXPERIMENTAL_TableFeature(),
      ]
    },
  }),
  endpoints: [],
  globals: [Header, Footer, SiteSettings, Settings, AISettings],
  plugins: [
    ...plugins,
    s3Storage({
      collections: {
        media: {
          generateFileURL: ({ filename }) => `${process.env.NEXT_PUBLIC_S3_HOSTNAME}/${filename}`,
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || '',
        forcePathStyle: true,
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
