"use client";

import React, { useState, useEffect, useRef } from 'react'
import { getOwnerAgentResponse } from '@/ai/ownerAgent' // Ваш новый серверный экшен для владельца
import { toast, useAuth } from '@payloadcms/ui'

interface ChatMessage {
  id: number
  sender: 'user' | 'ai'
  text: string
}

const OwnerAgentChatWidget: React.FC = () => {
  const { user } = useAuth() // Получаем текущего пользователя
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Проверка роли пользователя. Этот компонент будет доступен только админам.
  // В Payload CMS можно настроить доступ к кастомным компонентам в payload.config.ts
  // Но клиентская проверка здесь для дополнительной безопасности и UX.
  const isAdmin = user?.roles?.includes('admin')

  useEffect(() => {
    if (messages.length === 0 && !loading && isAdmin) {
      setMessages([{
        id: 1,
        sender: 'ai',
        text: 'Привет, я ваш бизнес-помощник! Чем могу помочь с аналитикой магазина сегодня?',
      }])
    }
    scrollToBottom()
  }, [messages, loading, isAdmin])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (input.trim() === '' || loading || !isAdmin) return

    const newUserMessage: ChatMessage = { id: messages.length + 1, sender: 'user', text: input }
    setMessages(prevMessages => [...prevMessages, newUserMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await getOwnerAgentResponse({
        userQuery: input,
      })

      if (response.error) {
        setError(response.error)
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: `Ошибка: ${response.error}` }])
        toast.error(response.error)
      } else if (response.result) {
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: response.result || 'Извините, не могу предоставить ответ.' }])
      }
    } catch (err) {
      setError('Ошибка при получении ответа от ИИ.')
      console.error('Owner Agent Chat Error:', err)
      setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: 'Произошла ошибка при обработке вашего запроса.' }])
      toast.error('Произошла ошибка при обработке вашего запроса.')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return null // Не рендерим виджет, если пользователь не админ
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-8 w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Бизнес-помощник ИИ</h2>
      <div className="chat-history border border-gray-200 rounded-md p-3 mb-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`mb-2 p-2 rounded-lg max-w-[90%] ${msg.sender === 'user'
              ? 'bg-blue-100 text-blue-800 ml-auto'
              : 'bg-gray-100 text-gray-800 mr-auto'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="mb-2 p-2 rounded-lg bg-gray-100 text-gray-800 mr-auto">
            <span className="animate-pulse">ИИ думает...</span>
          </div>
        )}
        {error && <p className="text-red-500 text-center">{error}</p>}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input flex">
        <input
          type="text"
          className="flex-1 border rounded-l-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Спросите об аналитике, маркетинге, товарах..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              handleSendMessage()
            }
          }}
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}

export default OwnerAgentChatWidget
