import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { CreateApartment, UpdateSocietyConfig } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { parseBulk } from '../../lib/apartments-csv'
import {
  EMPTY_SOCIETY,
  SETUP_STEPS,
  isSocietyComplete,
  societyErrors,
  type SocietyField,
} from '../../lib/setup-wizard'
import { PageHeader } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/admin/setup')({ component: SetupWizard })

const SOCIETY_FIELDS: { key: SocietyField; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Society name', placeholder: 'Green Valley Heights' },
  { key: 'address', label: 'Address', placeholder: '123 Main Road' },
  { key: 'city', label: 'City', placeholder: 'Bengaluru' },
  { key: 'state', label: 'State', placeholder: 'Karnataka' },
  { key: 'pincode', label: 'Pincode', placeholder: '560001' },
]

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2">
      {SETUP_STEPS.map((step, i) => {
        const state = i === current ? 'current' : i < current ? 'done' : 'todo'
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' +
                (state === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : state === 'done'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground')
              }
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span
              className={
                'text-sm font-medium ' + (state === 'todo' ? 'text-muted-foreground' : 'text-foreground')
              }
            >
              {step.label}
            </span>
            {i < SETUP_STEPS.length - 1 && <span className="bg-border mx-2 h-px flex-1" />}
          </li>
        )
      })}
    </ol>
  )
}

function SetupWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [society, setSociety] = useState<UpdateSocietyConfig>(EMPTY_SOCIETY)
  const [touched, setTouched] = useState<Partial<Record<SocietyField, boolean>>>({})
  const [csv, setCsv] = useState('')

  const errors = societyErrors(society)
  const societyValid = isSocietyComplete(society)
  const { rows: apartments, errors: csvErrors } = useMemo(() => parseBulk(csv), [csv])

  const finish = useMutation({
    mutationFn: async () => {
      await apiClient.updateSociety(society)
      if (apartments.length > 0) {
        await apiClient.createApartmentsBulk({ apartments: apartments as CreateApartment[] })
      }
    },
    onSuccess: () => navigate({ to: '/admin' }),
  })

  return (
    <div>
      <PageHeader title="Society setup" description="Get your society ready in three quick steps." />
      <Card>
        <CardContent className="pt-6">
          <Stepper current={step} />

          {step === 0 && (
            <div className="max-w-xl space-y-4">
              {SOCIETY_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    placeholder={placeholder}
                    value={society[key]}
                    onChange={(e) => setSociety((s) => ({ ...s, [key]: e.target.value }))}
                    onBlur={() => setTouched((t) => ({ ...t, [key]: true }))}
                  />
                  {touched[key] && errors[key] && <p className="text-destructive text-xs">{errors[key]}</p>}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="max-w-2xl space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="csv">Apartments (one per line: tower,number,floor,bhk)</Label>
                <Textarea
                  id="csv"
                  rows={8}
                  placeholder={'A,101,1,2BHK\nA,102,1,2BHK\nB,201,2,3BHK'}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                {apartments.length} valid {apartments.length === 1 ? 'apartment' : 'apartments'} parsed. You can
                also skip this and add apartments later.
              </p>
              {csvErrors.length > 0 && (
                <ul className="text-destructive space-y-0.5 text-xs">
                  {csvErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-xl space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Society</h3>
                <p className="text-muted-foreground text-sm">
                  {society.name} — {society.address}, {society.city}, {society.state} {society.pincode}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Apartments</h3>
                <p className="text-muted-foreground text-sm">
                  {apartments.length} {apartments.length === 1 ? 'apartment' : 'apartments'} will be imported.
                </p>
              </div>
              {finish.isError && (
                <p className="text-destructive text-sm">
                  Setup failed: {String((finish.error as Error)?.message ?? 'error')}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              Back
            </Button>
            {step < SETUP_STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && !societyValid) || (step === 1 && csvErrors.length > 0)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => finish.mutate()} disabled={!societyValid || finish.isPending}>
                {finish.isPending ? 'Finishing…' : 'Finish setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
