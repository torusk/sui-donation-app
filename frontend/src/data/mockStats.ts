import type { BoxStats, RoundUnit } from '../types'

export const mockBoxStats: BoxStats = {
  totalDonatedMist: BigInt('4_521_000_000_000'.replace(/_/g, '')),
  donorCount: 89,
}

export const ROUND_UNITS: RoundUnit[] = [
  { label: '0.01 SUI', valueMist: BigInt(10_000_000) },
  { label: '0.1 SUI',  valueMist: BigInt(100_000_000) },
  { label: '1 SUI',    valueMist: BigInt(1_000_000_000) },
]

export const MIST_PER_SUI = BigInt(1_000_000_000)

export function mistToSui(mist: bigint): number {
  return Number(mist) / Number(MIST_PER_SUI)
}

export function formatSui(mist: bigint, decimals = 4): string {
  const sui = mistToSui(mist)
  if (sui === 0) return '0'
  if (sui < 0.0001) return '< 0.0001'
  return sui.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}
