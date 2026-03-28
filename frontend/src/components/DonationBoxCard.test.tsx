import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DonationBoxCard } from './DonationBoxCard'
import type { DonationBox } from '../types'

const mockBox: DonationBox = {
  id: '1',
  title: 'テスト募金箱',
  description: 'テスト用の説明文です。寄付をよろしくお願いします。',
  goalAmount: 1000,
  currentAmount: 600,
  creatorAddress: '0xabc123',
  deadline: '2026-05-01',
  status: 'active',
  category: '教育',
}

describe('DonationBoxCard', () => {
  it('タイトルを表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    expect(screen.getByText('テスト募金箱')).toBeInTheDocument()
  })

  it('説明文を表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    expect(screen.getByText(/テスト用の説明文/)).toBeInTheDocument()
  })

  it('カテゴリーバッジを表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    expect(screen.getByText('教育')).toBeInTheDocument()
  })

  it('目標金額と現在金額を表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    expect(screen.getByText(/600/)).toBeInTheDocument()
    expect(screen.getByText(/1,000/)).toBeInTheDocument()
  })

  it('進捗率60%のプログレスバーを表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '60')
  })

  it('達成済みの場合「達成」バッジを表示する', () => {
    render(<DonationBoxCard box={{ ...mockBox, status: 'completed' }} />)
    expect(screen.getByText('達成')).toBeInTheDocument()
  })

  it('期限日を表示する', () => {
    render(<DonationBoxCard box={mockBox} />)
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })
})
