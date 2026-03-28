import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DonationPage } from './DonationPage'

vi.mock('@mysten/dapp-kit', () => ({
  useCurrentAccount: vi.fn(() => null),
  useSuiClientQuery: vi.fn(() => ({ data: null, isLoading: false })),
  ConnectModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}))

describe('DonationPage', () => {
  it('タグラインを表示する', () => {
    render(<DonationPage />)
    expect(screen.getByText('端数を、善意に。')).toBeInTheDocument()
  })

  it('ロゴを表示する', () => {
    render(<DonationPage />)
    expect(screen.getByText('SuiDonate')).toBeInTheDocument()
  })

  it('統計エリアを表示する', () => {
    render(<DonationPage />)
    expect(screen.getByRole('region', { name: '募金箱の統計' })).toBeInTheDocument()
  })

  it('ウォレット接続ボタンを表示する（未接続時）', () => {
    render(<DonationPage />)
    expect(screen.getByText('ウォレットを接続する')).toBeInTheDocument()
  })
})
