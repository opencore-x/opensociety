import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Apartment, CreateHouseHelp, HouseHelp, HouseHelpType, IdProofType } from '@opensociety/shared'
import { houseHelpTypeSchema, idProofTypeSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/house-help')({ component: HouseHelpPage })

function AddHouseHelp() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<HouseHelpType>('MAID')
  const [idProofType, setIdProofType] = useState<IdProofType>('AADHAAR')
  const [idProofNumber, setIdProofNumber] = useState('')

  const reset = () => {
    setName('')
    setPhone('')
    setType('MAID')
    setIdProofType('AADHAAR')
    setIdProofNumber('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateHouseHelp = { name: name.trim(), type }
      if (phone.trim()) body.phone = phone.trim()
      if (idProofNumber.trim()) {
        body.idProofType = idProofType
        body.idProofNumber = idProofNumber.trim()
      }
      return apiClient.createHouseHelp(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house-help'] })
      reset()
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="hh-name">Name</Label>
        <Input
          id="hh-name"
          className="w-44"
          placeholder="Lakshmi Devi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-phone">Phone</Label>
        <Input
          id="hh-phone"
          className="w-36"
          placeholder="+91…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {houseHelpTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>ID proof</Label>
        <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {idProofTypeSchema.options.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-idnum">ID number</Label>
        <Input
          id="hh-idnum"
          className="w-44"
          placeholder="optional"
          value={idProofNumber}
          onChange={(e) => setIdProofNumber(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? 'Adding…' : 'Add help'}
      </Button>
      {mutation.isError && (
        <p className="text-destructive w-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function HouseHelpRow({ help, apartments }: { help: HouseHelp; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showFlats, setShowFlats] = useState(false)
  const [name, setName] = useState(help.name)
  const [phone, setPhone] = useState(help.phone ?? '')
  const [type, setType] = useState<HouseHelpType>(help.type)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help'] })

  const save = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { name: name.trim(), phone: phone.trim() || null, type }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { isActive: !help.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell>
          <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {houseHelpTypeSchema.options.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
              {save.isPending ? '…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow className={help.isActive ? undefined : 'opacity-60'}>
        <TableCell className="font-medium">{help.name}</TableCell>
        <TableCell className="text-muted-foreground">{help.phone ?? '—'}</TableCell>
        <TableCell>
          <Badge variant="secondary">{help.type}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {help.idProofType ? `${help.idProofType}${help.idProofNumber ? ` · ${help.idProofNumber}` : ''}` : '—'}
        </TableCell>
        <TableCell>
          <Badge variant={help.isActive ? 'default' : 'secondary'}>{help.isActive ? 'Active' : 'Inactive'}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowFlats((s) => !s)}>
              {showFlats ? 'Hide flats' : 'Flats'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant={help.isActive ? 'ghost' : 'default'}
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {toggleActive.isPending ? '…' : help.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showFlats && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/40">
            <AssignmentsPanel helpId={help.id} apartments={apartments} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function AssignmentsPanel({ helpId, apartments }: { helpId: string; apartments: Apartment[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const assignments = useQuery({
    queryKey: ['house-help-assignments', helpId],
    queryFn: () => apiClient.listHouseHelpAssignments(helpId),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help-assignments', helpId] })
  const labelOf = (id: string) => {
    const a = apartments.find((x) => x.id === id)
    return a ? `${a.tower}-${a.apartmentNo}` : id
  }

  const add = useMutation({
    mutationFn: () => apiClient.assignHouseHelp(helpId, apartmentId),
    onSuccess: () => {
      invalidate()
      setApartmentId('')
    },
  })
  const remove = useMutation({
    mutationFn: (aptId: string) => apiClient.removeHouseHelpAssignment(helpId, aptId),
    onSuccess: invalidate,
  })

  const assignedIds = new Set((assignments.data ?? []).map((a) => a.apartmentId))
  const available = apartments.filter((a) => !assignedIds.has(a.id))

  return (
    <div className="space-y-3 py-1">
      <p className="text-sm font-medium">Assigned flats</p>
      <div className="flex flex-wrap gap-2">
        {(assignments.data ?? []).length === 0 && (
          <span className="text-muted-foreground text-sm">Not assigned to any flat yet.</span>
        )}
        {(assignments.data ?? []).map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-1.5">
            {labelOf(a.apartmentId)}
            <button
              className="hover:text-destructive"
              onClick={() => remove.mutate(a.apartmentId)}
              disabled={remove.isPending}
              aria-label={`Remove ${labelOf(a.apartmentId)}`}
            >
              ✕
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Add a flat" />
          </SelectTrigger>
          <SelectContent>
            {available.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!apartmentId || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? '…' : 'Assign'}
        </Button>
      </div>
      {add.isError && <p className="text-destructive text-sm">{(add.error as Error).message}</p>}
    </div>
  )
}

function HouseHelpPage() {
  const help = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })

  return (
    <div className="space-y-6">
      <PageHeader
        title="House help"
        description={`${help.data?.length ?? 0} domestic worker${help.data?.length === 1 ? '' : 's'} registered`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Register house help</CardTitle>
        </CardHeader>
        <CardContent>
          <AddHouseHelp />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All house help</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={help}
            empty={help.isSuccess && help.data?.length === 0}
            emptyText="No house help yet. Register one above."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>ID proof</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {help.data?.map((h) => (
                  <HouseHelpRow key={h.id} help={h} apartments={apartments.data ?? []} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
