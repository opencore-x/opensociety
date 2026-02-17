import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>OpenSociety</h1>
      <p>Privacy-first, self-hosted society management platform</p>
      <p>Built with TanStack Start</p>
    </div>
  )
}
