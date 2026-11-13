import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/analytics'

export const Route = createFileRoute('/demo/analytics')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
