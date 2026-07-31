export const timeRanges = [
  { seconds: 300, label: 'Last 5 minutes' },
  { seconds: 1800, label: 'Last 30 minutes' },
  { seconds: 3600, label: 'Last hour' },
  { seconds: 21600, label: 'Last 6 hours' },
  { seconds: 86400, label: 'Last 24 hours' },
  { seconds: 604800, label: 'Last 7 days' }
] as const

export type TimeRangeSeconds = (typeof timeRanges)[number]['seconds']

export function pointsForRange(seconds: number) {
  if (seconds <= 3600) return 60
  if (seconds <= 86400) return 90
  return 120
}
