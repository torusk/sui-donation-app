import type { DonationBox } from '../types'
import styles from './DonationBoxCard.module.css'

type Props = {
  box: DonationBox
}

export function DonationBoxCard({ box }: Props) {
  const progressPercent = Math.min(
    Math.round((box.currentAmount / box.goalAmount) * 100),
    100,
  )

  const formattedDeadline = new Date(box.deadline).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <article className={styles.card}>
      <div className={styles.imageArea}>
        {box.imageUrl ? (
          <img src={box.imageUrl} alt={box.title} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <span className={styles.placeholderIcon}>🫙</span>
          </div>
        )}
        <span className={`${styles.categoryBadge} ${styles[`category_${box.category}`] ?? ''}`}>
          {box.category}
        </span>
        {box.status === 'completed' && (
          <span className={styles.completedBadge}>達成</span>
        )}
      </div>

      <div className={styles.content}>
        <h2 className={styles.title}>{box.title}</h2>
        <p className={styles.description}>{box.description}</p>

        <div className={styles.progressSection}>
          <div className={styles.amounts}>
            <span className={styles.currentAmount}>
              {box.currentAmount.toLocaleString()} SUI
            </span>
            <span className={styles.goalAmount}>
              / {box.goalAmount.toLocaleString()} SUI
            </span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPercent}% 達成`}
          >
            <div
              className={`${styles.progressFill} ${box.status === 'completed' ? styles.progressCompleted : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.progressLabel}>{progressPercent}% 達成</span>
        </div>

        <div className={styles.footer}>
          <span className={styles.deadline}>期限: {formattedDeadline}</span>
          <button className={styles.detailButton}>詳細を見る</button>
        </div>
      </div>
    </article>
  )
}
