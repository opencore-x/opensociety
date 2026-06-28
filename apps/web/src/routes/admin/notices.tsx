import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/components/admin/stub'

export const Route = createFileRoute('/admin/notices')({
  component: () => <ComingSoon title="Notices" description="Publish and manage society notices." />,
})
