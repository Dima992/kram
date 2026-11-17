import type { ArrayField, Field } from 'payload'

import type { LinkAppearances } from './link'

import { deepMerge } from '@/utilities/deepMerge'
import { link } from './link'
import { adminLabel } from '@/utilities/adminLabel'

type LinkGroupType = (options?: {
  appearances?: LinkAppearances[] | false
  overrides?: Partial<ArrayField>
}) => Field

export const linkGroup: LinkGroupType = ({ appearances, overrides = {} } = {}) => {
  const generatedLinkGroup: Field = {
    name: 'links',
    type: 'array',
    label: adminLabel('Посилання', 'Ссылки'),
    fields: [
      link({
        appearances,
      }),
    ],
  }

  return deepMerge(generatedLinkGroup, overrides)
}
