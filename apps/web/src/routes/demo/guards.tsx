import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/guards'

export const Route = createFileRoute('/demo/guards')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
