export type DateRange = {
  from: Date
  to: Date
}

export type StatWithChange = {
  value: number
  previousValue: number
  change: number // percentage change
}

export type TimeSeriesPoint = {
  date: string
  value: number
}

export type CategoryBreakdown = {
  name: string
  revenue: number
}

export type TopProduct = {
  name: string
  units: number
  revenue: number
}

export type TopCustomer = {
  name: string
  email: string
  orders: number
  spent: number
}

export type CustomerSegment = {
  label: string
  count: number
  percentage: number
  description: string
}

export type ChannelBreakdown = {
  channel: string
  revenue: number
  percentage: number
}
