import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function OpenCartButton({
  className,
  quantity,
  ...rest
}: {
  className?: string
  quantity?: number
}) {
  const pathname = usePathname()
  const label = pathname.startsWith('/ru') ? 'Корзина' : 'Кошик'

  return (
    <Button
      variant="nav"
      size="clear"
      aria-label={label}
      className="navLink relative items-end hover:cursor-pointer"
      {...rest}
    >
      <ShoppingCart className="size-5" aria-hidden="true" />
      <span className="hidden md:inline">{label}</span>

      {quantity ? (
        <>
          <span>•</span>
          <span>{quantity}</span>
        </>
      ) : null}
    </Button>
  )
}