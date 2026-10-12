'use client'

import { useAuth } from '@/providers/Auth'
import Link from 'next/link'
import React, { Fragment, useEffect, useState } from 'react'

export const LogoutPage: React.FC = (props) => {
  const { logout } = useAuth()
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout()
        setSuccess('Ви вийшли з системи.')
      } catch (_) {
        setError('Ви вже вийшли з системи.')
      }
    }

    void performLogout()
  }, [logout])

  return (
    <Fragment>
      {(error || success) && (
        <div className="prose dark:prose-invert">
          <h1>{error || success}</h1>
          <p>
            Що б ви хотіли зробити далі?
            <Fragment>
              {' '}
              <Link href="/search">Натисніть тут</Link>
              {' щоб перейти до покупок.'}
            </Fragment>
            {' Щоб увійти знову, '}
            <Link href="/login">натисніть тут</Link>.
          </p>
        </div>
      )}
    </Fragment>
  )
}
