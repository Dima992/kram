"use client";

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import AgentChatPanel from './AgentChatPanel'

const FloatingMascot: React.FC = () => {
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)
  const pathname = usePathname()

  const toggleChatPanel = () => {
    setIsChatPanelOpen(prev => !prev)
  }

  return (
    <>
      <button
        onClick={toggleChatPanel}
        className="fixed bottom-8 right-8 bg-blue-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-blue-600 transition-all duration-300 animate-bounce-subtle z-40"
        // Добавьте CSS для animate-bounce-subtle в вашем globals.css или другом файле стилей
        // Пример CSS (можно добавить в globals.css):
        // @keyframes bounce-subtle {
        //   0%, 100% { transform: translateY(0); }
        //   50% { transform: translateY(-5px); }
        // }
        // .animate-bounce-subtle {
        //   animation: bounce-subtle 3s infinite ease-in-out;
        // }
      >
        {/* Замените на вашу иконку маскота, например, SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      <AgentChatPanel
        isOpen={isChatPanelOpen}
        onClose={toggleChatPanel}
        currentUrl={pathname}
      />
    </>
  )
}

export default FloatingMascot
