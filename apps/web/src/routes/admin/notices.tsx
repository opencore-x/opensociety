import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateNotice, NoticePriority } from '@opensociety/shared'
import { noticePrioritySchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/notices')({ component: NoticesPage })

const PRIORITY_VARIANT: Record<NoticePriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  URGENT: 'destructive',
  HIGH: 'destructive',
  NORMAL: 'secondary',
  LOW: 'outline',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function CreateNoticeForm() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<NoticePriority>('NORMAL')
  const [expiresAt, setExpiresAt] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateNotice = { title, body, priority }
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString()
      return apiClient.createNotice(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      setTitle('')
      setBody('')
      setPriority('NORMAL')
      setExpiresAt('')
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim() && body.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="n-title">Title</Label>
        <Input id="n-title" placeholder="Water supply interruption" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="n-body">Message</Label>
        <Textarea
          id="n-body"
          rows={4}
          placeholder="Details of the announcement…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as NoticePriority)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noticePrioritySchema.options.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-exp">Expires (optional)</Label>
          <Input
            id="n-exp"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-56"
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || !title.trim() || !body.trim()}>
          {mutation.isPending ? 'Publishing…' : 'Publish notice'}
        </Button>
      </div>
      {mutation.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">Published ✓</p>}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function NoticesPage() {
  const notices = useQuery({ queryKey: ['notices'], queryFn: apiClient.listNotices })

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Publish announcements to residents." />

      <Card>
        <CardHeader>
          <CardTitle>New notice</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateNoticeForm />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <QueryState
          q={notices}
          empty={notices.isSuccess && notices.data?.length === 0}
          emptyText="No notices published yet."
        >
          {notices.data?.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{n.title}</CardTitle>
                  <Badge variant={PRIORITY_VARIANT[n.priority]}>{n.priority}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{n.body}</p>
                <p className="text-muted-foreground mt-3 text-xs">
                  Published {formatDate(n.publishedAt)}
                  {n.expiresAt ? ` · expires ${formatDate(n.expiresAt)}` : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </QueryState>
      </div>
    </div>
  )
}
