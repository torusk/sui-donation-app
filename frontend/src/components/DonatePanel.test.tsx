import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DonatePanel } from './DonatePanel'

// テスト用のモック関数を外部に定義してbeforeEachで差し替える
let mockAccount: unknown = null
let mockBalance: unknown = { data: null, isLoading: false }

vi.mock('@mysten/dapp-kit', () => ({
  useCurrentAccount: () => mockAccount,
  useSuiClientQuery: () => mockBalance,
  ConnectModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}))

describe('DonatePanel (未接続)', () => {
  beforeEach(() => {
    mockAccount = null
    mockBalance = { data: null, isLoading: false }
  })

  it('ウォレット接続ボタンを表示する', () => {
    render(<DonatePanel />)
    expect(screen.getByText('ウォレットを接続する')).toBeInTheDocument()
  })

  it('ヒントテキストを表示する', () => {
    render(<DonatePanel />)
    expect(screen.getByText(/Sui対応ウォレット/)).toBeInTheDocument()
  })
})

describe('DonatePanel (接続済み・端数あり)', () => {
  beforeEach(() => {
    mockAccount = { address: '0xabc' }
    mockBalance = {
      data: { totalBalance: '1347000000' },
      isLoading: false,
    }
  })

  it('残高を表示する', () => {
    render(<DonatePanel />)
    expect(screen.getByText(/1\.347/)).toBeInTheDocument()
  })

  it('丸める単位ボタンを3つ表示する', () => {
    render(<DonatePanel />)
    const group = screen.getByRole('group', { name: '丸める単位を選択' })
    expect(group.querySelectorAll('button').length).toBe(3)
  })

  it('寄付ボタンが表示される', () => {
    render(<DonatePanel />)
    expect(screen.getByRole('button', { name: /SUI を寄付する/ })).toBeInTheDocument()
  })
})
