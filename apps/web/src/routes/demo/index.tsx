import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/index'

export const Route = createFileRoute('/demo/')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
