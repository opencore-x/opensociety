import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/components/admin/stub'

export const Route = createFileRoute('/admin/residents')({
  component: () => <ComingSoon title="Residents" description="Approve residents and manage roles." />,
})
