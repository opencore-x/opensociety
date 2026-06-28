import { createFileRoute } from '@tanstack/react-router'

import { ComingSoon } from '@/components/admin/stub'

export const Route = createFileRoute('/admin/guards')({
  component: () => <ComingSoon title="Guards" description="Register and manage gate staff." />,
})
