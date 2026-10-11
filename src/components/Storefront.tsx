import { ProductGridItem } from '@/components/ProductGridItem'
import configPromise from '@payload-config'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

type Locale = 'uk' | 'ru'

const copy = {
  uk: {
    title: 'Затишок починається вдома',
    description:
      'Текстиль і речі для дому, до яких хочеться повертатися. Добираємо натуральні матеріали, спокійні кольори та продуманий комфорт.',
    shop: 'Переглянути каталог',
    storyLink: 'Наша історія',
    featuredTitle: 'Популярні товари',
    featuredDescription: 'Речі, які ми обрали для щоденного затишку.',
    viewAll: 'Усі товари',
    emptyProducts: 'Нові товари скоро з’являться в каталозі.',
    storyTitle: 'Речі, що роблять дім особливим',
    storyFirst:
      'Ми віримо в силу продуманого дизайну. Кожна річ у нашій колекції покликана додати краси, якості та комфорту у щоденне життя.',
    storySecond:
      'Обираємо приємні на дотик матеріали, спокійні кольори та речі поза швидкоплинними трендами — для затишку, який залишається з вами надовго.',
  },
  ru: {
    title: 'Уют начинается дома',
    description:
      'Текстиль и вещи для дома, куда хочется возвращаться. Выбираем натуральные материалы, спокойные цвета и продуманный комфорт.',
    shop: 'Смотреть каталог',
    storyLink: 'Наша история',
    featuredTitle: 'Популярные товары',
    featuredDescription: 'Вещи, которые мы выбрали для домашнего уюта.',
    viewAll: 'Все товары',
    emptyProducts: 'Скоро в каталоге появятся новые товары.',
    storyTitle: 'Вещи, которые делают дом особенным',
    storyFirst:
      'Мы верим в силу продуманного дизайна. Каждая вещь в нашей коллекции призвана добавить красоты, качества и комфорта в повседневную жизнь.',
    storySecond:
      'Выбираем приятные на ощупь материалы, спокойные цвета и вещи вне мимолётных трендов — для уюта, который остаётся с вами надолго.',
  },
} satisfies Record<Locale, Record<string, string>>

type StorefrontProps = {
  locale: Locale
}

const getFeaturedProducts = unstable_cache(
  async (locale: Locale) => {
    const payload = await getPayload({ config: configPromise })
    const productResults = await payload.find({
      collection: 'products',
      depth: 2,
      draft: false,
      limit: 6,
      locale,
      overrideAccess: false,
      sort: '-createdAt',
    })

    return productResults.docs
  },
  ['featured-products'],
  { revalidate: 3600, tags: ['products'] },
)

export async function Storefront({ locale }: StorefrontProps) {
  const products = await getFeaturedProducts(locale)
  const text = copy[locale]
  const localizedHref = (href: string) => `${locale === 'ru' ? '/ru' : ''}${href}`

  return (
    <>
      <section className="relative overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        <div className="container">
          <div className="py-16 sm:py-20 lg:py-28">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                {text.title}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300 sm:text-xl">
                {text.description}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neutral-950 px-8 text-base font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                  href="#products"
                >
                  {text.shop}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-300 px-8 text-base font-medium transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  href="#about"
                >
                  {text.storyLink}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24" id="products">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium sm:text-3xl">{text.featuredTitle}</h2>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
              {text.featuredDescription}
            </p>
          </div>
          <Link
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950 sm:inline-flex dark:text-neutral-400 dark:hover:text-white"
            href={localizedHref('/shop')}
          >
            {text.viewAll}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <ProductGridItem
                key={product.id}
                locale={locale}
                priority={index === 0}
                product={product}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {text.emptyProducts}
          </p>
        )}

        <div className="mt-12 text-center sm:hidden">
          <Link
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            href={localizedHref('/shop')}
          >
            {text.viewAll}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-neutral-100/70 dark:bg-neutral-900/70" id="about">
        <div className="container py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">{text.storyTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
              {text.storyFirst}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
              {text.storySecond}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
