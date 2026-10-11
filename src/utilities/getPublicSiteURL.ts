export function getPublicSiteURL(siteURL: string | null | undefined): string {
  if (!siteURL?.trim()) {
    throw new Error('Публічну URL-адресу сайту не налаштовано.')
  }

  let url: URL
  try {
    url = new URL(siteURL.trim())
  } catch {
    throw new Error('Вкажіть повну публічну URL-адресу сайту, наприклад https://example.com.')
  }

  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('URL-адреса сайту має бути HTTP(S)-адресою без логіна, параметрів чи фрагмента.')
  }

  return url.toString().replace(/\/+$/, '')
}
