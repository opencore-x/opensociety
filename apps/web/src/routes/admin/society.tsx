import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { UpdateSocietyConfig } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/admin/society')({ component: SocietyPage })

const EMPTY: UpdateSocietyConfig = { name: '', address: '', city: '', state: '', pincode: '', gstin: '' }

const FIELDS: { key: keyof UpdateSocietyConfig; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Society name', placeholder: 'Green Valley Heights' },
  { key: 'address', label: 'Address', placeholder: '123 Main Road' },
  { key: 'city', label: 'City', placeholder: 'Bengaluru' },
  { key: 'state', label: 'State', placeholder: 'Karnataka' },
  { key: 'pincode', label: 'Pincode', placeholder: '560001' },
  { key: 'gstin', label: 'GSTIN (for invoices, optional)', placeholder: '29ABCDE1234F1Z5' },
]

function SocietyForm({ initial }: { initial: UpdateSocietyConfig }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UpdateSocietyConfig>(initial)
  const mutation = useMutation({
    mutationFn: () => apiClient.updateSociety(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['society'] }),
  })

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{label}</Label>
          <Input
            id={key}
            placeholder={placeholder}
            value={form[key] ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
        {mutation.isError && <span className="text-destructive text-sm">Save failed</span>}
      </div>
    </form>
  )
}

function SocietyPage() {
  const { t } = useT()
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })

  return (
    <div>
      <PageHeader title={t('nav.society')} description={t('page.society.desc')} />
      <Card>
        <CardHeader>
          <CardTitle>Society details</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState q={society}>
            <SocietyForm
              key={society.data?.id ?? 'new'}
              initial={
                society.data
                  ? {
                      name: society.data.name,
                      address: society.data.address,
                      city: society.data.city,
                      state: society.data.state,
                      pincode: society.data.pincode,
                      gstin: society.data.gstin ?? '',
                    }
                  : EMPTY
              }
            />
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
