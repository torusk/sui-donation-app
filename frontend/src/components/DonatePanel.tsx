import { useState } from 'react'
import { useCurrentAccount, useSuiClientQuery, ConnectModal } from '@mysten/dapp-kit'
import { ROUND_UNITS, formatSui } from '../data/mockStats'
import styles from './DonatePanel.module.css'

type Props = {
  onDonate?: (amountMist: bigint) => void
}

export function DonatePanel({ onDonate }: Props) {
  const account = useCurrentAccount()
  const [connectOpen, setConnectOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState(1) // default: 0.1 SUI

  const { data: balanceData, isLoading } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address ?? '' },
    { enabled: !!account },
  )

  const balanceMist = BigInt(balanceData?.totalBalance ?? '0')
  const roundUnit = ROUND_UNITS[selectedUnit]
  const donationMist = balanceMist % roundUnit.valueMist
  const hasDust = donationMist > BigInt(0)

  function handleDonate() {
    if (!hasDust) return
    onDonate?.(donationMist)
  }

  if (!account) {
    return (
      <div className={styles.wrapper}>
        <ConnectModal
          open={connectOpen}
          onOpenChange={setConnectOpen}
          trigger={
            <button className={styles.connectButton} onClick={() => setConnectOpen(true)}>
              ウォレットを接続する
            </button>
          }
        />
        <p className={styles.hint}>
          Sui対応ウォレット（Slush等）が必要です
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading} aria-label="読み込み中">
          <div className={styles.spinner} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.balanceRow}>
        <span className={styles.balanceLabel}>残高</span>
        <span className={styles.balanceValue}>{formatSui(balanceMist)} SUI</span>
      </div>

      <div className={styles.unitSection}>
        <span className={styles.unitLabel}>丸める単位</span>
        <div className={styles.unitButtons} role="group" aria-label="丸める単位を選択">
          {ROUND_UNITS.map((unit, i) => (
            <button
              key={unit.label}
              className={`${styles.unitButton} ${selectedUnit === i ? styles.unitActive : ''}`}
              onClick={() => setSelectedUnit(i)}
              aria-pressed={selectedUnit === i}
            >
              {unit.label}
            </button>
          ))}
        </div>
      </div>

      {hasDust ? (
        <div className={styles.preview} aria-live="polite">
          <span className={styles.previewLabel}>端数</span>
          <span className={styles.previewAmount}>{formatSui(donationMist, 6)} SUI</span>
        </div>
      ) : (
        <p className={styles.noRemainder} aria-live="polite">
          {balanceMist === BigInt(0)
            ? '残高がありません'
            : 'この単位での端数はありません'}
        </p>
      )}

      <button
        className={styles.donateButton}
        onClick={handleDonate}
        disabled={!hasDust}
        aria-label={hasDust ? `${formatSui(donationMist, 6)} SUI を寄付する` : '寄付できません'}
      >
        {hasDust ? `${formatSui(donationMist, 6)} SUI を寄付する` : '端数なし'}
      </button>
    </div>
  )
}
