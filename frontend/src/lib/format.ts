const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(amount: number): string {
  return inr.format(amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export function formatPct(value: number): string {
  return `${Math.round(value)}%`
}
