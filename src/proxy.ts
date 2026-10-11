import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const defaultLocale = 'uk'
const locales = ['uk', 'ru'] as const
const localeRewriteHeader = 'x-locale-rewrite'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.headers.get(localeRewriteHeader) === '1') {
    return NextResponse.next()
  }

  // Пропускаем служебные пути, админку и статику
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Проверяем, есть ли уже локаль в URL
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  )

  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1]
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(locale.length + 1) || '/'

    if (locale === 'uk') {
      const response = NextResponse.redirect(url)
      response.cookies.set('locale', 'uk', { path: '/', sameSite: 'lax' })
      return response
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', locale)
    requestHeaders.set(localeRewriteHeader, '1')

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    })
    response.cookies.set('locale', locale, { path: '/', sameSite: 'lax' })
    return response
  }

  const preferredLocale = request.cookies.get('locale')?.value
  const locale = preferredLocale === 'ru' ? 'ru' : defaultLocale

  if (locale === 'ru') {
    request.nextUrl.pathname = `/ru${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-locale', defaultLocale)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next|admin|api|favicon.ico).*)'],
}
