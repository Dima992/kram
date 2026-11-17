import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { link } from '@/fields/link'
import { adminLabel } from '@/utilities/adminLabel'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: adminLabel('Підвал сайту', 'Подвал сайта'),
  access: {
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      name: 'navItems',
      label: adminLabel('Посилання колонки «Інформація»', 'Ссылки колонки «Информация»'),
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
    },
    {
      name: 'contacts',
      label: adminLabel('Контакти', 'Контакты'),
      type: 'group',
      fields: [
        {
          name: 'phones',
          label: adminLabel('Телефони', 'Телефоны'),
          type: 'array',
          fields: [
            {
              name: 'label',
              label: adminLabel(
                'Підпис (необов’язково, наприклад, Основний)',
                'Подпись (необязательно, например, Основной)',
              ),
              type: 'text',
            },
            {
              name: 'number',
              label: adminLabel(
                'Номер (наприклад, +380962063144)',
                'Номер (например, +380962063144)',
              ),
              type: 'text',
              required: true,
            },
            {
              name: 'enabled',
              label: adminLabel('Показувати на сайті', 'Показывать на сайте'),
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'emails',
          label: adminLabel('Ел. пошта', 'Эл. почта'),
          type: 'array',
          fields: [
            {
              name: 'email',
              label: adminLabel(
                'Адреса (наприклад, info@kramnyca.com.ua)',
                'Адрес (например, info@kramnyca.com.ua)',
              ),
              type: 'email',
              required: true,
            },
            {
              name: 'enabled',
              label: adminLabel('Показувати на сайті', 'Показывать на сайте'),
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'address',
          label: adminLabel('Адреса магазину', 'Адрес магазина'),
          type: 'text',
          localized: true,
        },
        {
          name: 'other',
          label: adminLabel(
            'Інше (будь-які додаткові контакти)',
            'Другое (любые дополнительные контакты)',
          ),
          type: 'array',
          fields: [
            {
              name: 'label',
              label: adminLabel(
                'Назва (наприклад, Графік роботи)',
                'Название (например, График работы)',
              ),
              type: 'text',
              required: true,
            },
            {
              name: 'value',
              label: adminLabel('Значення', 'Значение'),
              type: 'text',
              required: true,
            },
            {
              name: 'enabled',
              label: adminLabel('Показувати на сайті', 'Показывать на сайте'),
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
    {
      name: 'socials',
      label: adminLabel('Соцмережі', 'Соцсети'),
      type: 'array',
      fields: [
        {
          name: 'platform',
          label: adminLabel('Соцмережа', 'Соцсеть'),
          type: 'select',
          required: true,
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'Telegram', value: 'telegram' },
            { label: 'Viber', value: 'viber' },
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Pinterest', value: 'pinterest' },
            { label: 'TikTok', value: 'tiktok' },
            { label: adminLabel('Інше', 'Другое'), value: 'other' },
          ],
        },
        {
          name: 'customName',
          label: adminLabel('Назва соцмережі', 'Название соцсети'),
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.platform === 'other',
          },
        },
        {
          name: 'url',
          label: adminLabel('Посилання (вставте повністю)', 'Ссылка (вставьте полностью)'),
          type: 'text',
          required: true,
        },
        {
          name: 'enabled',
          label: adminLabel('Показувати на сайті', 'Показывать на сайте'),
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      name: 'paymentMethods',
      label: adminLabel(
        'Способи оплати (логотипи в підвалі)',
        'Способы оплаты (логотипы в подвале)',
      ),
      type: 'array',
      admin: {
        description: adminLabel(
          'Завантажуйте логотип у форматі SVG (краще) або PNG із прозорим фоном. PNG: ширина 240 px, висота 80 px, файл до 100 КБ. JPG не завантажуйте (білий фон). Прапорець «Показувати» вимкнений за замовчуванням: увімкніть його після підключення оплати. Порядок змінюється перетягуванням.',
          'Загружайте логотип в формате SVG (предпочтительно) или PNG с прозрачным фоном. PNG: ширина 240 px, высота 80 px, файл до 100 КБ. JPG не загружайте (белый фон). Флажок «Показывать» выключен по умолчанию: включите его после подключения оплаты. Порядок меняется перетаскиванием.',
        ),
      },
      fields: [
        {
          name: 'name',
          label: adminLabel('Назва (наприклад, Visa)', 'Название (например, Visa)'),
          type: 'text',
          required: true,
        },
        {
          name: 'logo',
          label: adminLabel('Логотип', 'Логотип'),
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'enabled',
          label: adminLabel('Показувати на сайті', 'Показывать на сайте'),
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
