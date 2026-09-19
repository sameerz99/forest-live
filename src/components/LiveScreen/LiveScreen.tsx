import { useEffect, useMemo, useRef, useState } from 'react'
import { ForestSoundPlayer } from '../../audio/ForestSoundPlayer'
import type { DonationEvent } from '../../types/donation'
import { forestStore } from '../../state/forestStore'
import { useForestState } from '../../state/useForestState'
import { ForestCanvas } from '../ForestCanvas/ForestCanvas'

const gifts = [
  { icon: '🌰', name: 'Seed', count: 1, copy: 'A new beginning' },
  { icon: '🌱', name: 'Sprout', count: 5, copy: 'A brighter patch' },
  { icon: '🌲', name: 'Grove', count: 10, copy: 'A fuller forest' },
  { icon: '🌳', name: 'Ancient Tree', count: 50, copy: 'A lasting impact' },
]
function giftFor(count: number) { return [...gifts].reverse().find(gift => count >= gift.count) ?? gifts[0] }

export function LiveScreen() {
  const forest = useForestState()
  const soundPlayerRef = useRef<ForestSoundPlayer | null>(null)
  if (soundPlayerRef.current === null) soundPlayerRef.current = new ForestSoundPlayer()
  const [latestDonation, setLatestDonation] = useState<DonationEvent>()
  const [recentDonations, setRecentDonations] = useState<DonationEvent[]>([])
  const [soundPanelOpen, setSoundPanelOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  const [soundVolume, setSoundVolume] = useState(0.35)
  const [musicMissing, setMusicMissing] = useState(false)
  const leaderboard = useMemo(() => [...forest.donors].sort((a, b) => b.treesContributed - a.treesContributed).slice(0, 5), [forest.donors])
  const progress = Math.min(100, (forest.totalTrees / forest.targetTrees) * 100)

  useEffect(() => {
    let timeout: number | undefined
    const unsubscribe = forestStore.subscribe(({ donation, reset }) => {
      if (reset) {
        setRecentDonations([])
        setLatestDonation(undefined)
        window.clearTimeout(timeout)
        return
      }
      if (!donation) return
      setRecentDonations(previous => [donation, ...previous].slice(0, 6))
      setLatestDonation(donation)
      soundPlayerRef.current?.playDonation(donation.treeCount)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setLatestDonation(undefined), 3600)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timeout)
      soundPlayerRef.current?.destroy()
    }
  }, [])

  async function enableSound() {
    const player = soundPlayerRef.current
    if (!player) return
    const enabled = await player.enable().catch(() => false)
    setSoundEnabled(enabled)
    setMusicMissing(player.musicUnavailable)
    if (enabled) player.playPreview()
  }

  function toggleMute() {
    const muted = !soundMuted
    soundPlayerRef.current?.setMuted(muted)
    setSoundMuted(muted)
  }

  function toggleSoundPanel() {
    const opening = !soundPanelOpen
    setSoundPanelOpen(opening)
    if (opening && !soundEnabled) void enableSound()
  }

  function handleVolumeChange(volume: number) {
    soundPlayerRef.current?.setVolume(volume)
    setSoundVolume(volume)
  }

  return (
    <main className="live-page">
      <section className="live-frame" aria-label="Gift and Grow live forest">
        <div className="bunting" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
        <header className="live-header">
          <div className="brand"><span className="brand-leaf" aria-hidden="true">❧</span><div><div className="eyebrow">A little kindness. A greener world.</div><h1>Gift &amp; Grow</h1></div></div>
          <p className="header-tagline">Live forest celebration <span>♥</span></p>
          <div className="goal-card">
            <div className="progress-copy"><span aria-hidden="true">🌱 </span><strong>{forest.totalTrees.toLocaleString()}</strong><span> / {forest.targetTrees.toLocaleString()} trees</span></div>
            <div className="progress-track" role="progressbar" aria-label="Forest goal" aria-valuenow={forest.totalTrees} aria-valuemin={0} aria-valuemax={Math.max(forest.targetTrees, forest.totalTrees)}><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="garden-badge"><span>🌱</span>Community<br />garden</div>
        </header>
        <section className="forest-stage">
          <ForestCanvas />
          <div className={`donation-toast ${latestDonation ? 'is-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">
            {latestDonation && <><span className="toast-icon">{giftFor(latestDonation.treeCount).icon}</span><div><strong>{latestDonation.donorName} sent a {giftFor(latestDonation.treeCount).name}!</strong><span>A little kindness is taking root.</span></div><b className="toast-count">+{latestDonation.treeCount} ❧</b></>}
          </div>
          <div className={`live-sound ${soundPanelOpen ? 'is-open' : ''}`}>
            <button
              className="sound-fab"
              type="button"
              onClick={toggleSoundPanel}
              aria-expanded={soundPanelOpen}
              aria-controls="live-sound-panel"
              aria-label={soundPanelOpen ? 'Collapse sound controls' : 'Open sound controls'}
            >
              <span aria-hidden="true">{soundEnabled && soundMuted ? '♩' : '♪'}</span>
            </button>
            <div className="live-sound-panel" id="live-sound-panel" aria-hidden={!soundPanelOpen}>
              <div className="live-sound-heading">
                <strong>Forest ambience</strong>
                <span>{musicMissing ? 'Planting chimes only' : soundEnabled ? 'Now playing' : 'Sound is off'}</span>
              </div>
              {soundEnabled ? (
                <>
                  <button className="sound-mute" type="button" onClick={toggleMute} aria-pressed={soundMuted}>
                    {soundMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    disabled={soundMuted}
                    onChange={(event) => handleVolumeChange(Number(event.target.value))}
                    aria-label="Forest music and planting sound volume"
                  />
                  <span className="sound-volume-value">{Math.round(soundVolume * 100)}%</span>
                </>
              ) : (
                <button className="sound-mute" type="button" onClick={() => void enableSound()}>Try again</button>
              )}
            </div>
          </div>
        </section>
        <aside className="community-rail">
          <section className="gift-feed parchment">
            <div className="section-heading"><div><span>🎁</span><strong>Gift blooms</strong></div><span className="live-badge">● Live</span></div>
            {recentDonations.length ? <ol className="feed-list">{recentDonations.map(donation => {
              const gift = giftFor(donation.treeCount)
              return <li key={donation.id}><span className="feed-avatar">{donation.donorName.charAt(0).toUpperCase()}</span><span className="gift-icon">{gift.icon}</span><div><p><strong>{donation.donorName}</strong> sent a <b>{gift.name}!</b></p><span>+{donation.treeCount} {donation.treeCount === 1 ? 'tree' : 'trees'}</span></div></li>
            })}</ol> : <div className="feed-empty"><span>🌱</span><strong>Good things start small.</strong><p>Every gift brings a little more life to this forest.</p><span className="waiting-label">Waiting for the next seed of kindness</span></div>}
            <p className="feed-note">A little gift. A lasting patch of green.</p>
          </section>
          <section className="leaderboard parchment">
            <div className="section-heading"><div><span className="trophy">🏆</span><strong>Top growers</strong></div><span>This live</span></div>
            {leaderboard.length ? <ol>{leaderboard.map((donor, index) => <li key={donor.id}><span className="medal">{index + 1}</span><span className="donor-avatar">{donor.name.charAt(0).toUpperCase()}</span><strong>{donor.name}</strong><span>{donor.treesContributed.toLocaleString()} {donor.treesContributed === 1 ? 'tree' : 'trees'}</span></li>)}</ol> : <p className="empty-leaderboard">Plant the first tree to join the leaderboard.</p>}
          </section>
        </aside>
        <section className="gift-guide parchment" aria-label="What your gift grows">
          <h2>❧ &nbsp; What your gift grows &nbsp; ❧</h2>
          <div>{gifts.map(gift => <div className="gift-step" key={gift.name}><span>{gift.icon}</span><div><strong>{gift.count} {gift.name}</strong><small>{gift.copy}</small></div></div>)}</div>
        </section>
        <footer className="live-footer"><span>❧</span><strong>{forest.totalTrees.toLocaleString()}</strong> trees planted together<span className="footer-motto">♥ People plant good things here</span></footer>
        <a className="admin-shortcut" href="/admin" aria-label="Open forest controls">⚙</a>
      </section>
    </main>
  )
}
