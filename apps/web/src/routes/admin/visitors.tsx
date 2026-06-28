import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/components/admin/stub'

export const Route = createFileRoute('/admin/visitors')({
  component: () => <ComingSoon title="Visitors" description="Visitor logs, filters and reports." />,
})
