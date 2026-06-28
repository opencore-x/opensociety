import { StatusBar } from 'expo-status-bar'
import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OpenSociety</Text>
      <Text style={styles.subtitle}>Privacy-first society management</Text>
      <Link href="/visitors" style={styles.link}>
        View visitors →
      </Link>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  link: {
    marginTop: 16,
    fontSize: 16,
    color: '#0e7490',
    fontWeight: '600',
  },
})
