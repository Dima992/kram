"use client";

import React, { useState, useEffect } from 'react'
// Предполагается, что у вас есть UI-компонент для чипсов/кнопок
// import { Button } from '@/components/ui/button' // Пример
// import { Chip } from '@/components/ui/chip' // Пример

interface SearchAssistantProps {
  query: string
  onSuggestionClick: (suggestion: string) => void
}

const SearchAssistant: React.FC<SearchAssistantProps> = ({
  query,
  onSuggestionClick,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query && query.length > 5) { // Активируем ИИ для более длинных запросов
      const fetchSuggestions = async () => {
        setLoading(true)
        setError(null)
        try {
          // Здесь нужно будет вызвать серверный экшен для ИИ-агента поиска
          // Например, так:
          // const response = await fetch('/api/ai/search-suggestions', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ userQuery: query, currentUrl: window.location.pathname }),
          // })
          // const data = await response.json()
          // if (data.error) {
          //   setError(data.error)
          // } else {
          //   // Предполагается, что AI возвращает массив строк-подсказок
          //   setSuggestions(data.suggestions || [])
          // }

          // Заглушка для демонстрации
          await new Promise(resolve => setTimeout(resolve, 1000))
          if (query.length > 10) {
            setSuggestions([
              `Уточнить по "${query}" в категории "Одежда"`,
              `Показать "${query}" только новые поступления`,
              `Сравнить "${query}" с аналогами`,
            ])
          } else {
            setSuggestions([])
          }
        } catch (err) {
          setError('Failed to fetch AI suggestions.')
          console.error('AI Suggestion Error:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchSuggestions()
    } else {
      setSuggestions([])
    }
  }, [query])

  if (!query || query.length <= 5 || (!loading && suggestions.length === 0 && !error)) {
    return null // Не показываем, если запрос короткий или нет подсказок
  }

  return (
    <div className="search-assistant-container p-4 border-t border-gray-200 mt-4">
      {loading && <p>AI ищет подсказки...</p>}
      {error && <p className="text-red-500">Ошибка: {error}</p>}
      {!loading && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <p className="w-full mb-2 text-sm text-gray-600">Возможно, вы ищете:</p>
          {suggestions.map((suggestion, index) => (
            // Замените на ваши UI-компоненты Button/Chip
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-800 hover:bg-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchAssistant
