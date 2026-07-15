import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Apartment, BhkType, CreateApartment, UpdateApartment } from '@opensociety/shared'
import { bhkTypeSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { parseBulk } from '@/lib/apartments-csv'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/apartments')({ component: ApartmentsPage })

const BHK_OPTIONS = bhkTypeSchema.options

function AddSingle() {
  const { t } = useT()
  const qc = useQueryClient()
  const [tower, setTower] = useState('')
  const [apartmentNo, setApartmentNo] = useState('')
  const [floor, setFloor] = useState('')
  const [bhk, setBhk] = useState<BhkType | ''>('')

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateApartment = { tower, apartmentNo }
      if (floor.trim()) body.floor = Number(floor)
      if (bhk) body.bhkType = bhk
      return apiClient.createApartment(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apartments'] })
      setTower('')
      setApartmentNo('')
      setFloor('')
      setBhk('')
    },
  })

  return (
    <form
      className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (tower && apartmentNo) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="tower">{t('common.tower')}</Label>
        <Input id="tower" placeholder="A" value={tower} onChange={(e) => setTower(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="no">{t('page.apartments.number')}</Label>
        <Input id="no" placeholder="101" value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="floor">{t('page.apartments.floor')}</Label>
        <Input
          id="floor"
          type="number"
          placeholder="1"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.apartments.bhk')}</Label>
        <Select value={bhk} onValueChange={(v) => setBhk(v as BhkType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {BHK_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={mutation.isPending || !tower || !apartmentNo}>
        {mutation.isPending ? t('common.adding') : t('common.add')}
      </Button>
      {mutation.isError && (
        <p className="text-destructive col-span-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function BulkAdd() {
  const { t } = useT()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const { rows, errors } = parseBulk(text)

  const mutation = useMutation({
    mutationFn: () => apiClient.createApartmentsBulk({ apartments: rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apartments'] })
      setText('')
    },
  })

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="bulk">{t('page.apartments.csvLabel')}</Label>
        <Textarea
          id="bulk"
          rows={5}
          placeholder={'A,101,1,2BHK\nA,102,1,3BHK\nB,201,2'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      {errors.length > 0 && (
        <ul className="text-destructive space-y-0.5 text-xs">
          {errors.slice(0, 5).map((err) => (
            <li key={err}>{err}</li>
          ))}
          {errors.length > 5 && (
            <li>
              {t('page.apartments.andMorePrefix')}
              {errors.length - 5}
              {t('page.apartments.andMoreSuffix')}
            </li>
          )}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || rows.length === 0 || errors.length > 0}
        >
          {mutation.isPending
            ? t('page.apartments.importing')
            : `${t('page.apartments.import')} ${rows.length || ''} ${rows.length === 1 ? t('common.apartmentWordOne') : t('common.apartmentWordMany')}`}
        </Button>
        {mutation.isSuccess && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('page.apartments.imported')}</span>
        )}
        {mutation.isError && <span className="text-destructive text-sm">{(mutation.error as Error).message}</span>}
      </div>
    </div>
  )
}

function ApartmentRow({ apt }: { apt: Apartment }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [tower, setTower] = useState(apt.tower)
  const [apartmentNo, setApartmentNo] = useState(apt.apartmentNo)
  const [floor, setFloor] = useState(apt.floor?.toString() ?? '')
  const [bhk, setBhk] = useState<BhkType | ''>(apt.bhkType ?? '')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['apartments'] })

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateApartment = {
        tower,
        apartmentNo,
        floor: floor.trim() ? Number(floor) : null,
        bhkType: bhk || null,
      }
      return apiClient.updateApartment(apt.id, body)
    },
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateApartment(apt.id, { isActive: !apt.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={tower} onChange={(e) => setTower(e.target.value)} className="h-8 w-20" />
        </TableCell>
        <TableCell>
          <Input value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} className="h-8 w-24" />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="h-8 w-20"
          />
        </TableCell>
        <TableCell>
          <Select value={bhk} onValueChange={(v) => setBhk(v as BhkType)}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {BHK_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={save.isPending || !tower || !apartmentNo} onClick={() => save.mutate()}>
              {save.isPending ? '…' : t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className={apt.isActive ? undefined : 'opacity-60'}>
      <TableCell className="font-medium">{apt.tower}</TableCell>
      <TableCell>{apt.apartmentNo}</TableCell>
      <TableCell className="text-muted-foreground">{apt.floor ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{apt.bhkType ?? '—'}</TableCell>
      <TableCell>
        <Badge variant={apt.isActive ? 'default' : 'secondary'}>{apt.isActive ? t('common.active') : t('common.inactive')}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant={apt.isActive ? 'ghost' : 'default'}
            disabled={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {toggleActive.isPending ? '…' : apt.isActive ? t('common.deactivate') : t('common.activate')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ApartmentsPage() {
  const { t } = useT()
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.apartments')}
        description={`${apartments.data?.length ?? 0} ${apartments.data?.length === 1 ? t('page.apartments.unitOne') : t('page.apartments.unitMany')} ${t('common.registered')}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.apartments.addTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSingle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.apartments.bulkTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkAdd />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.apartments.allTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={apartments}
            empty={apartments.isSuccess && apartments.data?.length === 0}
            emptyText={t('page.apartments.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.tower')}</TableHead>
                  <TableHead>{t('page.apartments.number')}</TableHead>
                  <TableHead>{t('page.apartments.floor')}</TableHead>
                  <TableHead>{t('page.apartments.bhk')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartments.data?.map((a) => (
                  <ApartmentRow key={a.id} apt={a} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
