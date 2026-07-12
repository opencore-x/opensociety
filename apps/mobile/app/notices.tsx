import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { Notice } from '@opensociety/shared'
import { noticeMatchesQuery } from '@opensociety/shared'
import { apiClient } from '../api/client'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isUrgent(priority: Notice['priority']): boolean {
  return priority === 'HIGH' || priority === 'URGENT'
}

async function openAttachment(path: string) {
  try {
    const url = await apiClient.fetchUploadObjectUrl(path)
    await Linking.openURL(url)
  } catch {
    // best-effort; the attachment simply won't open if the fetch fails
  }
}

export default function Notices() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })

  const notices = useMemo(() => (data ?? []).filter((n) => noticeMatchesQuery(n, search)), [data, search])

  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  if (isError)
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Couldn’t load notices</Text>
        <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
      </View>
    )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={notices}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <TextInput
          style={styles.search}
          placeholder="Search notices"
          autoCorrect={false}
          value={search}
          onChangeText={setSearch}
        />
      }
      ListEmptyComponent={<Text style={styles.dim}>{search ? 'No matching notices.' : 'No notices yet.'}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.badge, isUrgent(item.priority) && styles.badgeUrgent]}>{item.priority}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.dim}>{formatDate(item.publishedAt)}</Text>
          </View>
          <Text style={styles.body}>{item.body}</Text>
          {item.attachmentUrl && (
            <Pressable onPress={() => openAttachment(item.attachmentUrl!)} style={styles.attachment}>
              <Text style={styles.attachmentText}>📎 {item.attachmentName ?? 'Attachment'}</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  search: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  body: { color: '#3f3f46', fontSize: 14, lineHeight: 20 },
  dim: { color: '#71717a', fontSize: 13 },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3f3f46',
    backgroundColor: '#e4e4e7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
  badge: {
    fontSize: 12,
    color: '#0e7490',
    backgroundColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeUrgent: { color: '#b91c1c', backgroundColor: '#fee2e2' },
  attachment: { alignSelf: 'flex-start', paddingVertical: 4 },
  attachmentText: { color: '#0e7490', fontWeight: '600', fontSize: 14 },
})
