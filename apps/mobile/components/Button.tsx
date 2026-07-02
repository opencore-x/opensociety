import { Pressable, StyleSheet, Text } from 'react-native'

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: 'primary' | 'outline' | 'danger'
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, styles[variant], disabled && styles.btnDisabled]}
    >
      <Text style={[styles.btnText, variant === 'outline' && styles.btnTextOutline]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnDisabled: { opacity: 0.5 },
  primary: { backgroundColor: '#0e7490' },
  danger: { backgroundColor: '#e11d48' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d4d4d8' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTextOutline: { color: '#3f3f46' },
})
