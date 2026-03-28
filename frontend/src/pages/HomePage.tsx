import { useState } from 'react'
import { DonationBoxCard } from '../components/DonationBoxCard'
import { mockDonationBoxes } from '../data/mockDonationBoxes'
import styles from './HomePage.module.css'

const ALL_CATEGORY = 'すべて'

export function HomePage() {
  const categories = [ALL_CATEGORY, ...Array.from(new Set(mockDonationBoxes.map((b) => b.category)))]
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY)

  const filtered =
    selectedCategory === ALL_CATEGORY
      ? mockDonationBoxes
      : mockDonationBoxes.filter((b) => b.category === selectedCategory)

  return (
    <main className={styles.main}>
      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>みんなの寄付で、世界を変える</h1>
        <p className={styles.heroSubtitle}>
          Suiブロックチェーン上の透明な募金プラットフォーム
        </p>
        <button className={styles.createButton}>+ 募金箱を作る</button>
      </section>

      {/* Filter & Stats */}
      <section className={styles.filterSection}>
        <div className={styles.filterBar}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.filterButton} ${selectedCategory === cat ? styles.filterActive : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <p className={styles.statsText}>
          <strong>{filtered.length}</strong> 件の募金箱
        </p>
      </section>

      {/* Card Grid */}
      <section className={styles.grid}>
        {filtered.map((box) => (
          <DonationBoxCard key={box.id} box={box} />
        ))}
      </section>
    </main>
  )
}
