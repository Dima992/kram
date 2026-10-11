import type { Feed, Product } from '@/payload-types'
import { getPublicSiteURL } from '@/utilities/getPublicSiteURL'
import { generateProductFeed } from '@/utilities/productFeed'
import { describe, expect, it } from 'vitest'

const feed: Feed = {
  id: 'feed-1',
  title: 'Літня колекція & Sale',
  slug: 'summer',
  platform: 'meta',
  language: 'ru',
  defaultBrand: 'Мій бренд',
  updatedAt: '',
  createdAt: '',
}

const product: Product = {
  id: 'product-1',
  title: 'Футболка <Літо>',
  slug: 'summer-shirt',
  description: {
    root: {
      type: 'root',
      children: [
        { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'М’яка & зручна' }] },
      ],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  },
  gallery: [
    {
      image: {
        id: 'image-1',
        alt: 'Футболка',
        filename: 'shirt.jpg',
        url: 'https://images.example/shirt.jpg',
        updatedAt: '',
        createdAt: '',
      },
    },
  ],
  categories: [
    {
      id: 'category-1',
      title: 'Одяг',
      slug: 'clothing',
      updatedAt: '',
      createdAt: '',
    },
  ],
  inventory: 4,
  baseCurrency: 'UAH',
  basePrice: 1200,
  priceInUAH: 1200,
  gtin: '4820000000000',
  _status: 'published',
  updatedAt: '',
  createdAt: '',
}

describe('product feed XML generation', () => {
  it('uses only the configured public site URL', () => {
    expect(getPublicSiteURL('https://shop.example/')).toBe('https://shop.example')
    expect(() => getPublicSiteURL('')).toThrow('не налаштовано')
    expect(() => getPublicSiteURL('javascript:alert(1)')).toThrow('HTTP(S)-адресою')
  })

  it('escapes product data and emits localized links and merchant identifiers', () => {
    const xml = generateProductFeed(feed, [product], 'https://shop.example')

    expect(xml).toContain('Літня колекція &amp; Sale')
    expect(xml).toContain('Футболка &lt;Літо&gt;')
    expect(xml).toContain('М’яка &amp; зручна')
    expect(xml).toContain('https://shop.example/ru/products/summer-shirt')
    expect(xml).toContain('<g:image_link>https://images.example/shirt.jpg</g:image_link>')
    expect(xml).toContain('<g:price>1200.00 UAH</g:price>')
    expect(xml).toContain('<g:brand>Мій бренд</g:brand>')
    expect(xml).toContain('<g:gtin>4820000000000</g:gtin>')
  })

  it('omits products marked to be excluded from every feed', () => {
    const xml = generateProductFeed(feed, [{ ...product, excludeFromFeed: true }], 'https://shop.example')

    expect(xml).not.toContain('<g:id>product-1</g:id>')
  })
})
