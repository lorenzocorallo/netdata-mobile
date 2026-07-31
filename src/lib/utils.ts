import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function formatValue(value: number, units = '') {
  if (!Number.isFinite(value)) return '—'
  if (units.toLowerCase() === 'bytes') return formatBytes(value)
  const absolute = Math.abs(value)
  const maximumFractionDigits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : 2
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
  if (!units) return formatted
  if (units === '%' || units.toLowerCase() === 'percentage') return `${formatted}%`
  return `${formatted} ${units}`
}

export function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return '—'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let scaled = value
  let index = 0
  while (scaled >= 1024 && index < units.length - 1) {
    scaled /= 1024
    index += 1
  }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2
  return `${scaled.toFixed(digits)} ${units[index]}`
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
