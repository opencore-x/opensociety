import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateNotice, NoticeCategory, NoticePriority } from '@opensociety/shared'
import { noticePrioritySchema, noticeCategorySchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

function AttachmentLink({ url, name }: { url: string; name: string }) {
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    try {
      const obj = await apiClient.fetchUploadObjectUrl(url)
      window.open(obj, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={open} disabled={busy}>
      📎 {busy ? 'Opening…' : name}
    </Button>
  )
}

function CreateNoticeForm() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<NoticePriority>('NORMAL')
  const [category, setCategory] = useState<NoticeCategory>('GENERAL')
  const [expiresAt, setExpiresAt] = useState('')
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const reset = () => {
    setTitle('')
    setBody('')
    setPriority('NORMAL')
    setCategory('GENERAL')
    setExpiresAt('')
    setAttachment(null)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateNotice = { title, body, priority, category }
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString()
      if (attachment) {
        payload.attachmentUrl = attachment.url
        payload.attachmentName = attachment.name
      }
      return apiClient.createNotice(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      reset()
    },
  })

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const { url } = await apiClient.uploadFile(file)
      setAttachment({ url, name: file.name })
    } catch (err) {
      setUploadError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

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
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as NoticeCategory)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noticeCategorySchema.options.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="n-file">Attachment (PDF/image, optional)</Label>
        <div className="flex items-center gap-3">
          <Input id="n-file" type="file" accept="image/*,application/pdf" onChange={onFile} className="w-72" disabled={uploading} />
          {uploading && <span className="text-muted-foreground text-sm">Uploading…</span>}
          {attachment && (
            <span className="flex items-center gap-2 text-sm">
              📎 {attachment.name}
              <button type="button" className="text-destructive" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                ✕
              </button>
            </span>
          )}
        </div>
        {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
      </div>
      <Button type="submit" disabled={mutation.isPending || uploading || !title.trim() || !body.trim()}>
        {mutation.isPending ? 'Publishing…' : 'Publish notice'}
      </Button>
      {mutation.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">Published ✓</p>}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

const ALL = 'ALL'

function NoticesPage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const notices = useQuery({
    queryKey: ['notices', q, category],
    queryFn: () => apiClient.listNotices({ q: q || undefined, category: category === ALL ? undefined : category }),
  })

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

      <Card>
        <CardHeader>
          <CardTitle>Archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="n-search">Search</Label>
              <Input
                id="n-search"
                className="w-64"
                placeholder="Keyword in title or message"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {noticeCategorySchema.options.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <QueryState q={notices} empty={notices.isSuccess && notices.data?.length === 0} emptyText="No notices match.">
            <div className="space-y-3">
              {notices.data?.map((n) => (
                <Card key={n.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base">{n.title}</CardTitle>
                      <div className="flex shrink-0 gap-1.5">
                        <Badge variant="outline">{n.category}</Badge>
                        <Badge variant={PRIORITY_VARIANT[n.priority]}>{n.priority}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{n.body}</p>
                    {n.attachmentUrl && (
                      <div className="mt-3">
                        <AttachmentLink url={n.attachmentUrl} name={n.attachmentName ?? 'Attachment'} />
                      </div>
                    )}
                    <p className="text-muted-foreground mt-3 text-xs">
                      Published {formatDate(n.publishedAt)}
                      {n.expiresAt ? ` · expires ${formatDate(n.expiresAt)}` : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
