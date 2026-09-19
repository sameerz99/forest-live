import { useState } from 'react'
import { registerDonation, resetForest } from '../../state/donationManager'
import { useForestState } from '../../state/useForestState'

const giftOptions = [1, 5, 10, 50] as const

export function AdminScreen() {
  const forest = useForestState()
  const [donorName, setDonorName] = useState('Forest Friend')
  const [customTreeCount, setCustomTreeCount] = useState('25')
  const [confirmation, setConfirmation] = useState('')

  function plantTrees(treeCount: number) {
    const donation = registerDonation({ donorName, treeCount, source: 'admin' })
    const treeLabel = treeCount === 1 ? 'tree is' : 'trees are'
    setConfirmation(
      `${donation.donorName}'s ${treeCount} ${treeLabel} growing on the live screen.`,
    )
  }

  function plantCustomTrees() {
    const treeCount = Number(customTreeCount)
    if (!Number.isInteger(treeCount) || treeCount < 1 || treeCount > 1000) {
      setConfirmation('Enter a whole number from 1 to 1,000 trees.')
      return
    }

    plantTrees(treeCount)
  }

  function handleReset() {
    if (!window.confirm('Reset the entire forest and clear the leaderboard?')) return
    resetForest()
    setConfirmation('The forest and leaderboard have been reset.')
  }

  return (
    <main className="admin-page">
      <section className="admin-card">
        <a className="back-link" href="/">← Back to live screen</a>
        <div className="admin-badge">Live control</div>
        <h1>Forest control</h1>
        <p className="admin-intro">Trigger the same donation flow that a future TikTok gift listener will use.</p>

        <div className="tree-total">
          <div className="total-icon">🌲</div>
          <div>
            <span>Current forest</span>
            <strong>{forest.totalTrees.toLocaleString()} trees</strong>
          </div>
        </div>

        <label htmlFor="donor-name">Donor name</label>
        <input
          id="donor-name"
          value={donorName}
          maxLength={30}
          onChange={(event) => setDonorName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && plantTrees(1)}
          placeholder="Enter a viewer name"
        />
        <div className="gift-options" aria-label="Simulate a gift">
          {giftOptions.map((treeCount) => (
            <button
              className="plant-button"
              type="button"
              key={treeCount}
              onClick={() => plantTrees(treeCount)}
            >
              <span>＋</span> Plant {treeCount} {treeCount === 1 ? 'tree' : 'trees'}
            </button>
          ))}
        </div>
        <div className="custom-gift">
          <label htmlFor="custom-tree-count">Custom tree count</label>
          <div className="custom-gift-controls">
            <input
              id="custom-tree-count"
              type="number"
              inputMode="numeric"
              min="1"
              max="1000"
              step="1"
              value={customTreeCount}
              onChange={(event) => setCustomTreeCount(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && plantCustomTrees()}
              aria-describedby="custom-tree-hint"
            />
            <button className="plant-button custom-plant-button" type="button" onClick={plantCustomTrees}>
              Plant custom
            </button>
          </div>
          <span id="custom-tree-hint" className="custom-tree-hint">1–1,000 trees</span>
        </div>
        <p className="confirmation" aria-live="polite">{confirmation}</p>

        <button className="reset-button" type="button" onClick={handleReset}>
          Reset forest
        </button>

        <div className="admin-tip">
          <span>Tip</span>
          Keep the live screen open in another tab. Updates are shared instantly between tabs.
        </div>
      </section>
    </main>
  )
}
