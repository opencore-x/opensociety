import { PageHeader } from '@/components/admin/ui'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">Coming soon.</CardContent>
      </Card>
    </div>
  )
}
