import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { BhkType, CreateApartment } from '@opensociety/shared'
import { bhkTypeSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
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
        <Label htmlFor="tower">Tower</Label>
        <Input id="tower" placeholder="A" value={tower} onChange={(e) => setTower(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="no">Number</Label>
        <Input id="no" placeholder="101" value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="floor">Floor</Label>
        <Input
          id="floor"
          type="number"
          placeholder="1"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>BHK</Label>
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
        {mutation.isPending ? 'Adding…' : 'Add'}
      </Button>
      {mutation.isError && (
        <p className="text-destructive col-span-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

type ParseResult = { rows: CreateApartment[]; errors: string[] }

function parseBulk(text: string): ParseResult {
  const rows: CreateApartment[] = []
  const errors: string[] = []
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [tower, apartmentNo, floor, bhk] = line.split(',').map((s) => s.trim())
      if (!tower || !apartmentNo) {
        errors.push(`Line ${i + 1}: tower and number are required`)
        return
      }
      const row: CreateApartment = { tower, apartmentNo }
      if (floor) {
        const n = Number(floor)
        if (Number.isNaN(n)) errors.push(`Line ${i + 1}: floor "${floor}" is not a number`)
        else row.floor = n
      }
      if (bhk) {
        const parsed = bhkTypeSchema.safeParse(bhk.toUpperCase())
        if (!parsed.success) errors.push(`Line ${i + 1}: invalid BHK "${bhk}"`)
        else row.bhkType = parsed.data
      }
      rows.push(row)
    })
  return { rows, errors }
}

function BulkAdd() {
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
        <Label htmlFor="bulk">CSV rows — one per line: tower,number,floor,bhk</Label>
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
          {errors.length > 5 && <li>…and {errors.length - 5} more</li>}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || rows.length === 0 || errors.length > 0}
        >
          {mutation.isPending ? 'Importing…' : `Import ${rows.length || ''} apartment${rows.length === 1 ? '' : 's'}`}
        </Button>
        {mutation.isSuccess && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Imported ✓</span>
        )}
        {mutation.isError && <span className="text-destructive text-sm">{(mutation.error as Error).message}</span>}
      </div>
    </div>
  )
}

function ApartmentsPage() {
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apartments"
        description={`${apartments.data?.length ?? 0} unit${apartments.data?.length === 1 ? '' : 's'} registered`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Add apartment</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSingle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk import</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkAdd />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All apartments</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={apartments}
            empty={apartments.isSuccess && apartments.data?.length === 0}
            emptyText="No apartments yet. Add one above."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tower</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>BHK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartments.data?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tower}</TableCell>
                    <TableCell>{a.apartmentNo}</TableCell>
                    <TableCell className="text-muted-foreground">{a.floor ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{a.bhkType ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
