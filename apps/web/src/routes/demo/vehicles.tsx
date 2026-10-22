import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/vehicles'

export const Route = createFileRoute('/demo/vehicles')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
