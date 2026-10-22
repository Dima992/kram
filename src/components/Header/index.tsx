import { getCachedGlobal } from '@/utilities/getGlobals'

import { HeaderClient } from './index.client'
import './index.css'

export async function Header() {
  const header = await getCachedGlobal('header', 1)()
  const siteSettings = await getCachedGlobal('site-settings', 1)()
  const logo = typeof siteSettings?.logo === 'object' ? siteSettings.logo : null

  return <HeaderClient header={header} logo={logo} />
}