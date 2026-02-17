import { renderToString } from 'react-dom/server'
import { StartServer } from '@tanstack/start/server'
import { createRouter } from './router'

export async function render(url: string) {
  const router = createRouter()
  await router.load(url)

  return renderToString(<StartServer router={router} />)
}
