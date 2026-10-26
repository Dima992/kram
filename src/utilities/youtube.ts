// Достаёт код ролика из обычной ссылки YouTube (работает на сервере и в браузере)
export const getYouTubeId = (url?: string | null): string | null => {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return match ? match[1] : null
}