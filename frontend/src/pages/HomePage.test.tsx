import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HomePage } from './HomePage'

// @mysten/dapp-kit の ConnectButton をモック
vi.mock('@mysten/dapp-kit', () => ({
  ConnectButton: () => <button>ウォレット接続</button>,
}))

describe('HomePage', () => {
  it('ページタイトルを表示する', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('募金箱カードが複数表示される', () => {
    render(<HomePage />)
    const cards = screen.getAllByRole('article')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('カテゴリーフィルターが表示される', () => {
    render(<HomePage />)
    expect(screen.getByText('すべて')).toBeInTheDocument()
  })

  it('募金箱の総数を表示する', () => {
    render(<HomePage />)
    // 数字が含まれる要素が存在すること
    expect(screen.getByText(/件/)).toBeInTheDocument()
  })
})
