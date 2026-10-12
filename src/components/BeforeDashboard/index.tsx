import { Banner } from '@payloadcms/ui'
import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

export const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>Ласкаво просимо до панелі керування!</h4>
      </Banner>
      Що робити далі:
      <ul className={`${baseClass}__instructions`}>
        <li>
          <SeedButton />
          {' з кількома товарами та сторінками, щоб швидко запустити новий проєкт, а потім '}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">відвідайте ваш сайт</a>
          {' щоб переглянути результат.'}
        </li>
        <li>
          {'Перейдіть до '}
          <a
            href="https://dashboard.stripe.com/test/apikeys"
            rel="noopener noreferrer"
            target="_blank"
          >
            Stripe, щоб отримати ваші API-ключі
          </a>
          {
            '. Створіть новий акаунт, якщо потрібно, потім вставте ключі у змінні середовища та перезапустіть сервер. Подробиці дивіться в '
          }
          <a
            href="https://github.com/payloadcms/payload/blob/3.x/templates/ecommerce/README.md#stripe"
            rel="noopener noreferrer"
            target="_blank"
          >
            README
          </a>
          {'.'}
        </li>
        <li>
          {'Змініть ваші '}
          <a
            href="https://payloadcms.com/docs/configuration/collections"
            rel="noopener noreferrer"
            target="_blank"
          >
            колекції
          </a>
          {' та додайте більше '}
          <a
            href="https://payloadcms.com/docs/fields/overview"
            rel="noopener noreferrer"
            target="_blank"
          >
            полів
          </a>
          {' за потреби. Якщо ви новачок у Payload, також рекомендуємо переглянути '}
          <a
            href="https://payloadcms.com/docs/getting-started/what-is-payload"
            rel="noopener noreferrer"
            target="_blank"
          >
            Getting Started
          </a>
          {' документацію.'}
        </li>
      </ul>
      {'Порада: цей блок — '}
      <a
        href="https://payloadcms.com/docs/admin/components#base-component-overrides"
        rel="noopener noreferrer"
        target="_blank"
      >
        кастомний компонент
      </a>
      {', його можна видалити в будь-який момент, оновивши ваш <strong>payload.config</strong>.'}
    </div>
  )
}
