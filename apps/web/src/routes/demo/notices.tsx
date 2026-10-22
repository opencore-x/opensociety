import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/notices'

export const Route = createFileRoute('/demo/notices')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
