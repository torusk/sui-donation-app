import { useState, useEffect } from 'react'
import styles from './BoxVisual.module.css'

type Props = {
  animate?: boolean
}

export function BoxVisual({ animate = false }: Props) {
  const [showCoin, setShowCoin] = useState(false)

  useEffect(() => {
    if (!animate) return
    setShowCoin(true)
    const t = setTimeout(() => setShowCoin(false), 800)
    return () => clearTimeout(t)
  }, [animate])

  return (
    <div className={styles.wrapper} aria-hidden="true">
      {showCoin && <span className={styles.coin}>🪙</span>}
      <span className={`${styles.jar} ${animate ? styles.jarTilt : ''}`}>🫙</span>
      <div className={styles.glow} />
    </div>
  )
}
