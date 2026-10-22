import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/society'

export const Route = createFileRoute('/demo/society')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
