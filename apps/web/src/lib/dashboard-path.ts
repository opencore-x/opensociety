import { useLocation } from '@tanstack/react-router'
import { isDemoPath } from './demo/mode'

export function useDashboardPath() {
  const demo = useLocation({ select: location => isDemoPath(location.pathname) })
  return (path: string) => demo ? path.replace(/^\/admin(?=\/|$)/, '/demo') : path
}
