import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/expenses'

export const Route = createFileRoute('/demo/expenses')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
