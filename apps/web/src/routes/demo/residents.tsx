import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/residents'

export const Route = createFileRoute('/demo/residents')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
