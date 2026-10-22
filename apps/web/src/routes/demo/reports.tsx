import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/reports'

export const Route = createFileRoute('/demo/reports')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
