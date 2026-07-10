export function normalizePhoneInput(value: string): string {
  const compact = value.replace(/\s+/g, '')
  if (!compact) return ''

  const hasLeadingPlus = compact.startsWith('+')
  const digits = compact.replace(/\D/g, '')

  if (!digits) return hasLeadingPlus ? '+' : ''

  if (hasLeadingPlus || digits.startsWith('380')) {
    return `+${digits}`
  }

  return digits
}
