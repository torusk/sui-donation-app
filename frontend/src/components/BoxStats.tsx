import type { BoxStats } from '../types'
import { formatSui } from '../data/mockStats'
import styles from './BoxStats.module.css'

type Props = {
  stats: BoxStats
}

export function BoxStats({ stats }: Props) {
  return (
    <div className={styles.wrapper} role="region" aria-label="募金箱の統計">
      <div className={styles.item}>
        <span className={styles.value}>{formatSui(stats.totalDonatedMist, 2)}</span>
        <span className={styles.unit}>SUI</span>
        <span className={styles.label}>累計寄付額</span>
      </div>
      <div className={styles.divider} aria-hidden="true" />
      <div className={styles.item}>
        <span className={styles.value}>{stats.donorCount.toLocaleString('ja-JP')}</span>
        <span className={styles.unit}>人</span>
        <span className={styles.label}>寄付者</span>
      </div>
    </div>
  )
}
