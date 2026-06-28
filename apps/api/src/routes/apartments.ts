import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { asc } from 'drizzle-orm'
import { apartments } from '@opensociety/db'
import { createApartmentSchema, createApartmentsBulkSchema } from '@opensociety/shared'
import { withDb, withAuth } from '../middleware'
import type { AppEnv } from '../types'

export const apartmentRoutes = new Hono<AppEnv>()
apartmentRoutes.use('*', withDb)
apartmentRoutes.use('*', withAuth)

apartmentRoutes.get('/', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(apartments)
    .orderBy(asc(apartments.tower), asc(apartments.apartmentNo))
  return c.json(rows)
})

apartmentRoutes.post('/', zValidator('json', createApartmentSchema), async (c) => {
  const [created] = await c.get('db').insert(apartments).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

// Society setup: bulk import (e.g. from a CSV upload).
apartmentRoutes.post('/bulk', zValidator('json', createApartmentsBulkSchema), async (c) => {
  const { apartments: list } = c.req.valid('json')
  const created = await c.get('db').insert(apartments).values(list).returning()
  return c.json({ count: created.length, apartments: created }, 201)
})
