import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/parking'

export const Route = createFileRoute('/demo/parking')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
