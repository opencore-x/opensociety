import { createFileRoute } from '@tanstack/react-router'
import { Route as AdminRoute } from '../admin/pre-approvals'

export const Route = createFileRoute('/demo/pre-approvals')({ component: DemoPage })

function DemoPage() {
  const Page = AdminRoute.options.component!
  return <Page />
}
