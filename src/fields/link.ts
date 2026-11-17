import type { Field } from 'payload'

import { deepMerge } from '@/utilities/deepMerge'
import { adminLabel } from '@/utilities/adminLabel'

export type LinkAppearances = 'default' | 'outline'

export const appearanceOptions: Record<
  LinkAppearances,
  { label: Record<'uk' | 'ru', string>; value: string }
> = {
  default: {
    label: adminLabel('Звичайний', 'Обычный'),
    value: 'default',
  },
  outline: {
    label: adminLabel('Контурний', 'Контурный'),
    value: 'outline',
  },
}

type LinkType = (options?: {
  appearances?: LinkAppearances[] | false
  disableLabel?: boolean
  overrides?: Record<string, unknown>
}) => Field

export const link: LinkType = ({ appearances, disableLabel = false, overrides = {} } = {}) => {
  const linkResult: Field = {
    name: 'link',
    type: 'group',
    label: adminLabel('Посилання', 'Ссылка'),
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'radio',
            admin: {
              layout: 'horizontal',
              width: '50%',
            },
            defaultValue: 'reference',
            options: [
              {
                label: adminLabel('Внутрішнє посилання', 'Внутренняя ссылка'),
                value: 'reference',
              },
              {
                label: adminLabel('Власна URL-адреса', 'Свой URL-адрес'),
                value: 'custom',
              },
            ],
          },
          {
            name: 'newTab',
            type: 'checkbox',
            admin: {
              style: {
                alignSelf: 'flex-end',
              },
              width: '50%',
            },
            label: adminLabel('Відкрити в новій вкладці', 'Открыть в новой вкладке'),
          },
        ],
      },
    ],
  }

  const linkTypes: Field[] = [
    {
      name: 'reference',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'reference',
      },
      label: adminLabel('Документ для посилання', 'Документ для ссылки'),
      maxDepth: 1,
      relationTo: ['pages'],
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData?.type === 'custom',
      },
      label: adminLabel('Власна URL-адреса', 'Свой URL-адрес'),
      localized: true, // Локализация для внешних произвольных ссылок
      required: true,
    },
  ]

  if (!disableLabel) {
    linkTypes.map((linkType) => ({
      ...linkType,
      admin: {
        ...linkType.admin,
        width: '50%',
      },
    }))

    linkResult.fields.push({
      type: 'row',
      fields: [
        ...linkTypes,
        {
          name: 'label',
          type: 'text',
          admin: {
            width: '50%',
          },
          label: adminLabel('Текст посилання', 'Текст ссылки'),
          localized: true, // Включаем мультиязычность текста ссылки (UK / RU)
          required: true,
        },
      ],
    })
  } else {
    linkResult.fields = [...linkResult.fields, ...linkTypes]
  }

  if (appearances !== false) {
    let appearanceOptionsToUse = [appearanceOptions.default, appearanceOptions.outline]

    if (appearances) {
      appearanceOptionsToUse = appearances.map((appearance) => appearanceOptions[appearance])
    }

    linkResult.fields.push({
      name: 'appearance',
      type: 'select',
      admin: {
        description: adminLabel('Виберіть вигляд посилання.', 'Выберите оформление ссылки.'),
      },
      defaultValue: 'default',
      options: appearanceOptionsToUse,
    })
  }

  return deepMerge(linkResult, overrides)
}
