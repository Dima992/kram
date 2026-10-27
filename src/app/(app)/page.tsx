import PageTemplate, { generateMetadata as generatePageMetadata } from './[slug]/page'

export const revalidate = 3600

// Главная (адрес «/») — это страница с адресом «home»
const homeParams = () => Promise.resolve({ slug: 'home' })

export default async function HomePage() {
  return <PageTemplate params={homeParams()} />
}

export async function generateMetadata() {
  return generatePageMetadata({ params: homeParams() })
}