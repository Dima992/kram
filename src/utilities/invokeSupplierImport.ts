import type { ImportSource } from '@/payload-types'
import { POST as importProducts } from '@/app/api/admin/catalog/import/route'

export async function invokeSupplierImport(
  sourceID: string,
  fileName: string,
  fileBuffer: Buffer,
  headers: Headers,
): Promise<Response> {
  const formData = new FormData()
  formData.set('sourceID', sourceID)
  formData.set('dryRun', 'false')
  formData.set(
    'file',
    new File([new Uint8Array(fileBuffer)], fileName, {
      type: fileName.toLowerCase().endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv',
    }),
  )

  const forwardedHeaders = new Headers()
  const cookie = headers.get('cookie')
  const cronSecret = headers.get('x-supplier-import-secret')
  if (cookie) forwardedHeaders.set('cookie', cookie)
  if (cronSecret) forwardedHeaders.set('x-supplier-import-secret', cronSecret)

  return importProducts(
    new Request('https://internal.invalid/api/admin/catalog/import', {
      method: 'POST',
      headers: forwardedHeaders,
      body: formData,
    }),
  )
}

export function supplierImportMessage(source: ImportSource, result: unknown): string {
  if (typeof result === 'object' && result && 'error' in result) {
    const errorMessage = result.error
    if (typeof errorMessage === 'string') return errorMessage.slice(0, 1000)
  }
  if (typeof result === 'object' && result && 'created' in result && 'updated' in result) {
    const errors =
      'errors' in result && Array.isArray(result.errors) ? result.errors.length : 0
    return `Створено: ${result.created}; оновлено: ${result.updated}.${errors ? ` Помилок або попереджень: ${errors}.` : ''}`
  }
  return `Імпорт постачальника «${source.name}» завершено.`
}

export function supplierImportSucceeded(responseOK: boolean, result: unknown): boolean {
  if (!responseOK || typeof result !== 'object' || !result || !('created' in result)) return false
  if (!('errors' in result)) return true
  return Array.isArray(result.errors) && result.errors.length === 0
}
