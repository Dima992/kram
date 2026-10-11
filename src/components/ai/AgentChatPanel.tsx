"use client";

import { getAiAgentInstruction } from '@/actions/getAiAgent'; // Серверный экшен инструкций
import { searchAgent } from '@/ai/searchAgent'; // Импортируем агента поиска
import React, { useEffect, useRef, useState } from 'react';

interface AgentChatPanelProps {
  isOpen: boolean
  onClose: () => void
  currentUrl: string
}

interface ChatMessage {
  id: number
  sender: 'user' | 'ai'
  text: string
}

const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  isOpen,
  onClose,
  currentUrl,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentName, setAgentName] = useState('AI Assistant')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      const fetchAgentInfo = async () => {
        setError(null)
        setLoading(true)
        try {
          const { prompt: initialPrompt, aiEnabled } = await getAiAgentInstruction(currentUrl, 'initial greeting')
          if (!aiEnabled) {
            setError('AI features are currently disabled.')
            setMessages([{ id: 1, sender: 'ai', text: 'AI функции отключены.' }])
          } else {
            setMessages([{ id: 1, sender: 'ai', text: `Привет! Я ваш ${agentName}. Чем могу помочь?` }])
          }
        } catch (err) {
          setError('Не удалось загрузить информацию об агенте.')
          console.error('Fetch Agent Info Error:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchAgentInfo()
    }
  }, [isOpen, currentUrl, agentName])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (input.trim() === '' || loading) return

    const newUserMessage: ChatMessage = { id: messages.length + 1, sender: 'user', text: input }
    setMessages(prevMessages => [...prevMessages, newUserMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const { aiEnabled } = await getAiAgentInstruction(currentUrl, input)

      if (!aiEnabled) {
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: 'AI функции отключены.' }])
        setLoading(false)
        return
      }

      // Вызываем searchAgent с объектом
      const aiResponse = await searchAgent({
        userQuery: input,
        productCatalog: [],
      })

      if (aiResponse.error) {
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: `Ошибка: ${aiResponse.error}` }])
      } else if (aiResponse.result) {
        setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: aiResponse.result || 'Извините, не могу ответить.' }])
      }
    } catch (err) {
      setError('Ошибка при получении ответа от ИИ.')
      console.error('AI Chat Error:', err)
      setMessages(prev => [...prev, { id: prev.length + 1, sender: 'ai', text: 'Произошла ошибка при обработке вашего запроса.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-end z-50">
      <div className="relative bg-white w-full max-w-sm h-full shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">{agentName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 120px)' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`mb-3 p-2 rounded-lg max-w-[80%] ${msg.sender === 'user'
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-gray-100 text-gray-800 mr-auto'
              }`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="mb-3 p-2 rounded-lg bg-gray-100 text-gray-800 mr-auto">
              <span className="animate-pulse">ИИ думает...</span>
            </div>
          )}
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 flex">
          <input
            type="text"
            className="flex-1 border rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Спросите что-нибудь..."
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
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  )
}

export default AgentChatPanel