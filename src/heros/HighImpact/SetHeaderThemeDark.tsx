'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { useEffect } from 'react'

export const SetHeaderThemeDark: React.FC = () => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  return null
}