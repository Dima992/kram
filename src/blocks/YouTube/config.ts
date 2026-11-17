import type { Block } from 'payload'

export const YouTube: Block = {
  slug: 'youtube',
  labels: { singular: 'YouTube', plural: 'YouTube' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'Посилання на відео YouTube',
      admin: {
        description: 'Вставте звичайне посилання, наприклад https://youtu.be/XXXXXXXXXXX',
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: 'Підпис (необов’язково)',
    },
  ],
}