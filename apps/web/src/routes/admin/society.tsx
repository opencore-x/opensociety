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

const FIELDS: { key: keyof UpdateSocietyConfig; labelKey: string; placeholder: string }[] = [
  { key: 'name', labelKey: 'page.society.fieldName', placeholder: 'Green Valley Heights' },
  { key: 'address', labelKey: 'common.address', placeholder: '123 Main Road' },
  { key: 'city', labelKey: 'common.city', placeholder: 'Bengaluru' },
  { key: 'state', labelKey: 'common.state', placeholder: 'Karnataka' },
  { key: 'pincode', labelKey: 'common.pincode', placeholder: '560001' },
  { key: 'gstin', labelKey: 'page.society.fieldGstin', placeholder: '29ABCDE1234F1Z5' },
]

function SocietyForm({ initial }: { initial: UpdateSocietyConfig }) {
  const { t } = useT()
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
      {FIELDS.map(({ key, labelKey, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key}>{t(labelKey)}</Label>
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
          {mutation.isPending ? t('common.saving') : t('common.saveChanges')}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('common.saved')}</span>}
        {mutation.isError && <span className="text-destructive text-sm">{t('common.saveFailed')}</span>}
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
          <CardTitle>{t('page.society.detailsTitle')}</CardTitle>
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
