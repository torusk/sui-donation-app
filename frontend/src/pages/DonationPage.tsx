import { useState } from 'react'
import { BoxVisual } from '../components/BoxVisual'
import { BoxStats } from '../components/BoxStats'
import { DonatePanel } from '../components/DonatePanel'
import { mockBoxStats } from '../data/mockStats'
import styles from './DonationPage.module.css'

export function DonationPage() {
  const [animating, setAnimating] = useState(false)

  function handleDonate(amountMist: bigint) {
    // TODO: コントラクト呼び出し（現在はモック）
    console.log('Donate:', amountMist.toString(), 'MIST')
    setAnimating(true)
    setTimeout(() => setAnimating(false), 900)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>SuiDonate</span>
      </header>

      <main className={styles.main}>
        <div className={styles.visual}>
          <BoxVisual animate={animating} />
        </div>

        <div className={styles.copy}>
          <h1 className={styles.tagline}>端数を、善意に。</h1>
          <p className={styles.subtitle}>
            SUIウォレットの端数をひとつの募金箱へ。
          </p>
        </div>

        <BoxStats stats={mockBoxStats} />

        <DonatePanel onDonate={handleDonate} />
      </main>

      <footer className={styles.footer}>
        <span>Powered by Sui Testnet</span>
      </footer>
    </div>
  )
}
