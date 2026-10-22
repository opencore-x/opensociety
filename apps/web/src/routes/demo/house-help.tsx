import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/house-help'

export const Route = createFileRoute('/demo/house-help')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
