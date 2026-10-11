'use client'

import Image from 'next/image'
import { useState } from 'react'

interface GalleryItem {
  image: {
    url: string
    alt?: string
  }
  variantOption?: string | { id: string; title: string }
}

interface ProductViewProps {
  product: {
    title: string
    priceInUAH: number
    description?: any // RichText / Lexical или HTML
    gallery?: GalleryItem[]
    options?: {
      id: string
      name: string // e.g. "Колір", "Розмір"
      values: { id: string; name: string }[]
    }[]
    aiPromptNotes?: string
  }
}

export function ProductView({ product }: ProductViewProps) {
  // Храним выбранные опции (например: { Color: 'Смарагдовий', Size: 'M' })
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Находим выбранный цвет для фильтрации галереи
  const selectedColor = selectedOptions['Колір'] || selectedOptions['Color']

  // Фильтрация галереи по выбранному цвету
  const filteredGallery = product.gallery?.filter((item) => {
    if (!item.variantOption) return true
    const optionName =
      typeof item.variantOption === 'object' ? item.variantOption.title : item.variantOption
    return !selectedColor || optionName === selectedColor
  }) || []

  const activeImages = filteredGallery.length > 0 ? filteredGallery : product.gallery || []
  const currentImage = activeImages[selectedImageIndex] || activeImages[0]

  const handleOptionSelect = (optionName: string, valueName: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: valueName,
    }))
    // Сбрасываем индекс картинки при смене цвета
    if (optionName === 'Колір' || optionName === 'Color') {
      setSelectedImageIndex(0)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:items-start">
        
        {/* ЛЕВАЯ КОЛОНКА: Галерея (Vercel Style) */}
        <div className="lg:col-span-7 flex flex-col-reverse lg:flex-row gap-4">
          {/* Миниатюры */}
          {activeImages.length > 1 && (
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[600px] shrink-0">
              {activeImages.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? 'border-black opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={item.image.url}
                    alt={item.image.alt || product.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Главное изображение */}
          <div className="relative aspect-square w-full rounded-2xl bg-neutral-100 overflow-hidden">
            {currentImage?.image?.url ? (
              <Image
                src={currentImage.image.url}
                alt={currentImage.image.alt || product.title}
                fill
                fetchPriority="high"
                loading="eager"
                priority
                quality={75}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover object-center"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">Немає фото</div>
            )}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: Панель покупки (Sticky) */}
        <div className="mt-10 px-4 sm:px-0 lg:mt-0 lg:col-span-5 lg:sticky lg:top-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{product.title}</h1>
          
          <div className="mt-3 flex items-baseline">
            <p className="text-3xl font-semibold tracking-tight text-neutral-900">
              {product.priceInUAH ? `${product.priceInUAH.toLocaleString('uk-UA')} ₴` : 'Ціну не вказано'}
            </p>
          </div>

          {/* Выбор опций (Цвет, Размер) */}
          {product.options && product.options.length > 0 && (
            <div className="mt-8 space-y-6">
              {product.options.map((option) => (
                <div key={option.id}>
                  <h3 className="text-sm font-medium text-neutral-900">{option.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.values.map((val) => {
                      const isSelected = selectedOptions[option.name] === val.name
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => handleOptionSelect(option.name, val.name)}
                          className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                            isSelected
                              ? 'border-black bg-black text-white shadow-sm'
                              : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                          }`}
                        >
                          {val.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Кнопка добавления в корзину */}
          <button
            type="button"
            className="mt-8 flex w-full items-center justify-center rounded-full bg-black px-8 py-4 text-base font-medium text-white hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Купити
          </button>

          {/* Аккордеоны / Детали */}
          <div className="mt-10 border-t border-neutral-200 pt-6 space-y-4">
            <details className="group [&_summary::-webkit-details-marker]:hidden" open>
              <summary className="flex cursor-pointer items-center justify-between text-neutral-900 font-medium">
                <span>Опис товару</span>
                <span className="transition group-open:-rotate-180">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </summary>
              <div className="mt-3 text-sm text-neutral-600 leading-relaxed">
                {/* Описание товара */}
                {typeof product.description === 'string' ? product.description : 'Якісний текстиль та одяг із натуральних матеріалів.'}
              </div>
            </details>

            <details className="group [&_summary::-webkit-details-marker]:hidden border-t border-neutral-100 pt-4">
              <summary className="flex cursor-pointer items-center justify-between text-neutral-900 font-medium">
                <span>Доставка та оплата</span>
                <span className="transition group-open:-rotate-180">
                  <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </summary>
              <div className="mt-3 text-sm text-neutral-600 leading-relaxed">
                Доставка Новою Поштою або Укрпоштою по всій Україні. Оплата карткою, LiqPay або при отриманні (післяплату).
              </div>
            </details>
          </div>

        </div>

      </div>
    </div>
  )
}