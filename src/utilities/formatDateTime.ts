import { format } from 'date-fns'
import { ru, uk } from 'date-fns/locale'

type Locale = 'uk' | 'ru'

type Props = {
  date: string
  format?: string
  locale?: Locale
}

const locales = { uk, ru }

export const formatDateTime = ({
  date,
  format: formatFromProps,
  locale = 'uk',
}: Props): string => {
  if (!date) return ''

  const dateFormat = formatFromProps ?? 'dd/MM/yyyy'

  const formattedDate = format(new Date(date), dateFormat, {
    locale: locales[locale] ?? locales.uk,
  })

  return formattedDate
}
