import type { Block } from 'payload'
import { adminLabel } from '@/utilities/adminLabel'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  labels: {
    singular: adminLabel('Медіаблок', 'Медиаблок'),
    plural: adminLabel('Медіаблоки', 'Медиаблоки'),
  },
  fields: [
    {
      name: 'media',
      type: 'upload',
      label: adminLabel('Медіафайл', 'Медиафайл'),
      relationTo: 'media',
      required: true,
    },
  ],
}
