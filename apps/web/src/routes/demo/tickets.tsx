import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/tickets'

export const Route = createFileRoute('/demo/tickets')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
