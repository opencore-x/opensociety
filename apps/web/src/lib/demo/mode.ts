export function isDemoPath(pathname: string) {
  return pathname === '/demo' || pathname.startsWith('/demo/')
}

export function isDemoBrowser() {
  return typeof window !== 'undefined' && isDemoPath(window.location.pathname)
}
