import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import { colors, radius } from '@/theme/tokens'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed, style]}
    >
      <Text style={[styles.label, variant !== 'primary' && styles.darkLabel]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.blue,
  },
  secondary: {
    backgroundColor: colors.softBlue,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  danger: {
    backgroundColor: colors.softRed,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  darkLabel: {
    color: colors.ink,
  },
})