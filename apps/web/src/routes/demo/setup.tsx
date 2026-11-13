import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/setup'

export const Route = createFileRoute('/demo/setup')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
