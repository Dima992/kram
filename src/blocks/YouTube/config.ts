import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

export const YouTube: Block = {
  slug: 'youtube',
  labels: {
    singular: adminLabel('Відео YouTube', 'Видео YouTube'),
    plural: adminLabel('Відео YouTube', 'Видео YouTube'),
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: adminLabel('Посилання на відео YouTube', 'Ссылка на видео YouTube'),
      admin: {
        description: adminLabel(
          'Вставте звичайне посилання, наприклад https://youtu.be/XXXXXXXXXXX',
          'Вставьте обычную ссылку, например https://youtu.be/XXXXXXXXXXX',
        ),
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: adminLabel('Підпис (необов’язково)', 'Подпись (необязательно)'),
    },
  ],
}
