import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function formatValue(value: number, units = '') {
  if (!Number.isFinite(value)) return '—'
  const absolute = Math.abs(value)
  const maximumFractionDigits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : 2
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
  if (!units) return formatted
  if (units === '%') return `${formatted}%`
  return `${formatted} ${units}`
}

export function timeAgo(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function cleanLabel(value: string) {
  return value.replaceAll('_', ' ').replaceAll('.', ' · ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
