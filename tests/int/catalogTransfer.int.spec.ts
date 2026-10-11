import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { parseSupplierFile, supplierColumn } from '@/utilities/parseSupplierFile'

describe('supplier file parsing', () => {
  it('parses quoted CSV fields and detects semicolon delimiters', async () => {
    const buffer = Buffer.from(
      'sku;title;price;description\r\nA-1;"Сорочка; літня";120,50;"Опис, у лапках"',
    )
    const rows = await parseSupplierFile('supplier.csv', buffer, 'auto', 'utf-8')

    expect(rows).toHaveLength(1)
    expect(rows[0].rowNumber).toBe(2)
    expect(supplierColumn(rows[0], 'TITLE')).toBe('Сорочка; літня')
    expect(supplierColumn(rows[0], 'description')).toBe('Опис, у лапках')
  })

  it('parses JSON arrays and products envelopes into normalized supplier rows', async () => {
    const rows = await parseSupplierFile(
      'supplier.json',
      Buffer.from(
        JSON.stringify({
          products: [
            { SKU: 'J-1', Title: 'Жакет', price: 1250, nested: { color: 'blue' } },
          ],
        }),
      ),
      'auto',
      'utf-8',
    )

    expect(rows).toHaveLength(1)
    expect(supplierColumn(rows[0], 'sku')).toBe('J-1')
    expect(supplierColumn(rows[0], 'title')).toBe('Жакет')
    expect(supplierColumn(rows[0], 'nested')).toBe('{"color":"blue"}')
  })

  it('reads the first worksheet from an Excel workbook', async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Products')
    worksheet.addRow(['sku', 'title', 'price'])
    worksheet.addRow(['B-2', 'Куртка', 2500])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const rows = await parseSupplierFile('supplier.xlsx', buffer, 'auto', 'utf-8')

    expect(rows).toHaveLength(1)
    expect(supplierColumn(rows[0], 'sku')).toBe('B-2')
    expect(supplierColumn(rows[0], 'price')).toBe('2500')
  })

  it('maps Google Merchant XML product fields and decodes XML entities', async () => {
    const buffer = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:g="http://base.google.com/ns/1.0"><channel>
        <item>
          <g:id>sku-1</g:id>
          <g:title>Товар &amp; подарунок</g:title>
          <g:description><![CDATA[<p>Опис товару</p>]]></g:description>
          <g:price>123.45 UAH</g:price>
          <g:availability>in stock</g:availability>
          <g:image_link>https://example.com/item.jpg</g:image_link>
          <g:brand>Бренд</g:brand>
          <g:gtin>1234567890123</g:gtin>
          <g:mpn>model-1</g:mpn>
          <g:product_type>Одяг &gt; Сорочки</g:product_type>
        </item>
        <item>
          <g:id>sku-2</g:id>
          <g:title>Немає в наявності</g:title>
          <g:price>50 USD</g:price>
          <g:availability>out_of_stock</g:availability>
        </item>
      </channel></rss>`)

    const rows = await parseSupplierFile('merchant.xml', buffer, 'auto', 'utf-8')

    expect(rows).toHaveLength(2)
    expect(supplierColumn(rows[0], 'sku')).toBe('sku-1')
    expect(supplierColumn(rows[0], 'title')).toBe('Товар & подарунок')
    expect(supplierColumn(rows[0], 'description')).toBe('Опис товару')
    expect(supplierColumn(rows[0], 'price')).toBe('123.45')
    expect(supplierColumn(rows[0], 'currency')).toBe('UAH')
    expect(supplierColumn(rows[0], 'stock')).toBe('1')
    expect(supplierColumn(rows[0], 'category')).toBe('Одяг > Сорочки')
    expect(supplierColumn(rows[1], 'stock')).toBe('0')
  })

  it('parses Atom language variants as one canonical product identity', async () => {
    const buffer = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
        <entry>
          <g:id>uk-variant</g:id>
          <g:title>Українська назва</g:title>
          <g:link>https://example.com/ua/p123456-product-uk.html</g:link>
          <g:price>100 UAH</g:price>
          <g:description>Український опис</g:description>
        </entry>
        <entry>
          <g:id>ru-variant</g:id>
          <g:title>Русское название</g:title>
          <g:link>https://example.com/p123456-product-ru.html</g:link>
          <g:price>100 UAH</g:price>
          <g:description>Русское описание</g:description>
        </entry>
      </feed>`)

    const rows = await parseSupplierFile('merchant.xml', buffer, 'auto', 'utf-8')

    expect(rows).toHaveLength(2)
    expect(supplierColumn(rows[0], '_locale')).toBe('uk')
    expect(supplierColumn(rows[1], '_locale')).toBe('ru')
    expect(supplierColumn(rows[0], '_productkey')).toBe('https://example.com/p123456')
    expect(supplierColumn(rows[1], '_productkey')).toBe('https://example.com/p123456')
    expect(supplierColumn(rows[0], 'description')).toBe('Український опис')
    expect(supplierColumn(rows[1], 'description')).toBe('Русское описание')
  })

  it('imports Ukrainian Atom products with unprefixed links and decodes feed entities', async () => {
    const buffer = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
        <entry>
          <g:id>6224</g:id>
          <g:title>Кокосова олія холодного віджиму</g:title>
          <g:link>https://example.com/index.php?route=product/product&amp;product_id=6224</g:link>
          <g:price>6.54 EUR</g:price>
          <g:description><![CDATA[Переваги: &bull; натуральна олія &mdash; без добавок]]></g:description>
        </entry>
        <entry>
          <g:id>6225</g:id>
          <g:title>Олія чорного кмину</g:title>
          <g:link>https://example.com/index.php?route=product/product&amp;product_id=6225</g:link>
          <g:price>11.15 EUR</g:price>
        </entry>
      </feed>`)

    const rows = await parseSupplierFile('merchant.xml', buffer, 'auto', 'utf-8')

    expect(rows).toHaveLength(2)
    expect(supplierColumn(rows[0], '_locale')).toBe('uk')
    expect(supplierColumn(rows[0], '_productkey')).toBe('https://example.com/p6224')
    expect(supplierColumn(rows[1], '_productkey')).toBe('https://example.com/p6225')
    expect(supplierColumn(rows[0], 'description')).toBe('Переваги: • натуральна олія — без добавок')
    expect(supplierColumn(rows[0], 'currency')).toBe('EUR')
  })

  it('rejects XML files that are not Google Merchant feeds', async () => {
    await expect(
      parseSupplierFile('merchant.xml', Buffer.from('<products />'), 'auto', 'utf-8'),
    ).rejects.toThrow('не схожий на фід Google Merchant')
  })

  it('supports Windows-1251 supplier CSV files', async () => {
    const buffer = Buffer.from([0x73, 0x6b, 0x75, 0x2c, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x0a, 0x41, 0x2d, 0x31, 0x2c, 0xcf])
    const rows = await parseSupplierFile('supplier.csv', buffer, 'auto', 'windows-1251')

    expect(supplierColumn(rows[0], 'title')).toBe('П')
  })

  it('rejects duplicate header columns', async () => {
    const buffer = Buffer.from('sku,SKU,price\nA-1,A-2,120')

    await expect(parseSupplierFile('supplier.csv', buffer, 'auto', 'utf-8')).rejects.toThrow(
      'однакові заголовки колонок',
    )
  })
})
