import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/billing'

export const Route = createFileRoute('/demo/billing')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
