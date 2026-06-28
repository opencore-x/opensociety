import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateGuard, Guard } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/guards')({ component: GuardsPage })

function AddGuard() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateGuard = { name }
      if (phone.trim()) body.phone = phone.trim()
      if (employeeCode.trim()) body.employeeCode = employeeCode.trim()
      return apiClient.createGuard(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guards'] })
      setName('')
      setPhone('')
      setEmployeeCode('')
    },
  })

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="g-name">Name</Label>
        <Input id="g-name" placeholder="Ramesh Kumar" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-phone">Phone</Label>
        <Input id="g-phone" placeholder="+91…" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-code">Employee code</Label>
        <Input
          id="g-code"
          placeholder="G-001"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? 'Adding…' : 'Add guard'}
      </Button>
      {mutation.isError && (
        <p className="text-destructive col-span-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function GuardRow({ guard }: { guard: Guard }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(guard.name)
  const [phone, setPhone] = useState(guard.phone ?? '')
  const [employeeCode, setEmployeeCode] = useState(guard.employeeCode ?? '')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guards'] })

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateGuard(guard.id, {
        name,
        phone: phone.trim() || null,
        employeeCode: employeeCode.trim() || null,
      }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateGuard(guard.id, { isActive: !guard.isActive }),
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
          <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="h-8 w-28" />
        </TableCell>
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
    <TableRow className={guard.isActive ? undefined : 'opacity-60'}>
      <TableCell className="font-medium">{guard.name}</TableCell>
      <TableCell className="text-muted-foreground">{guard.phone ?? '—'}</TableCell>
      <TableCell className="text-muted-foreground">{guard.employeeCode ?? '—'}</TableCell>
      <TableCell>
        <Badge variant={guard.isActive ? 'default' : 'secondary'}>{guard.isActive ? 'Active' : 'Inactive'}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={guard.isActive ? 'ghost' : 'default'}
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
          >
            {toggleActive.isPending ? '…' : guard.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function GuardsPage() {
  const guards = useQuery({ queryKey: ['guards'], queryFn: apiClient.listGuards })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guards"
        description={`${guards.data?.length ?? 0} guard${guards.data?.length === 1 ? '' : 's'} registered`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Register guard</CardTitle>
        </CardHeader>
        <CardContent>
          <AddGuard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All guards</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={guards}
            empty={guards.isSuccess && guards.data?.length === 0}
            emptyText="No guards yet. Register one above."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Employee code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guards.data?.map((g) => (
                  <GuardRow key={g.id} guard={g} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
