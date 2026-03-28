import { ConnectButton } from '@mysten/dapp-kit'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🫙</span>
          <span className={styles.logoText}>SuiDonate</span>
        </div>
        <ConnectButton />
      </div>
    </header>
  )
}
