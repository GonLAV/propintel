import { useId } from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native'
import { colors, radius } from '@/theme/tokens'

type TextFieldProps = TextInputProps & {
  label: string
  error?: string
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <View style={styles.wrapper}>
      <Text nativeID={`${id}-label`} style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        textAlign="right"
        placeholderTextColor={colors.placeholder}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? (
        <Text nativeID={errorId} accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    color: colors.ink,
    paddingHorizontal: 16,
    fontSize: 16,
    writingDirection: 'rtl',
  },
  inputError: {
    borderColor: colors.red,
    backgroundColor: colors.softRed,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    textAlign: 'right',
  },
})