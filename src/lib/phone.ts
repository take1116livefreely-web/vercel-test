export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }
  if (d.length === 10) {
    if (d.startsWith('03') || d.startsWith('06')) {
      return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
    }
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }
  return phone
}
