import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/duty'

export const Route = createFileRoute('/demo/duty')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
