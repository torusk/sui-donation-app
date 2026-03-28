import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BoxStats } from './BoxStats'

const stats = {
  totalDonatedMist: BigInt(4_521_000_000_000),
  donorCount: 89,
}

describe('BoxStats', () => {
  it('累計寄付額を表示する', () => {
    render(<BoxStats stats={stats} />)
    expect(screen.getByText(/4,521/)).toBeInTheDocument()
  })

  it('SUIの単位ラベルを表示する', () => {
    render(<BoxStats stats={stats} />)
    expect(screen.getByText('SUI')).toBeInTheDocument()
  })

  it('寄付者数を表示する', () => {
    render(<BoxStats stats={stats} />)
    expect(screen.getByText('89')).toBeInTheDocument()
  })
})
