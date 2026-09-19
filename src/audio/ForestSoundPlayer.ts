type Tone = {
  frequency: number
  offset: number
  duration: number
  volume?: number
  wave?: OscillatorType
}

export class ForestSoundPlayer {
  private music?: HTMLAudioElement
  musicUnavailable = false
  private context?: AudioContext
  private masterGain?: GainNode
  private volume = 0.35
  private muted = false

  async enable() {
    // Start the media element during the click, even if Web Audio is unavailable.
    if (!this.music) {
      this.music = new Audio(import.meta.env.BASE_URL + 'audio/forest-ambience.mp3')
      this.music.loop = true
      this.music.volume = this.volume * 0.65
    }
    const musicStarted = this.music.play().then(() => {
      this.musicUnavailable = false
      return true
    }).catch(() => {
      this.musicUnavailable = true
      return false
    })
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.masterGain = this.context.createGain()
        this.masterGain.connect(this.context.destination)
        this.updateMasterGain()
      }
      if (this.context.state === 'suspended') await this.context.resume()
    } catch { /* Music can still play without synthesized planting chimes. */ }
    return (await musicStarted) || this.context?.state === 'running'
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume))
    this.updateMasterGain()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.updateMasterGain()
  }

  playPreview() {
    this.playTones([
      { frequency: 392, offset: 0, duration: 0.12, volume: 0.22 },
      { frequency: 523.25, offset: 0.09, duration: 0.18, volume: 0.18 },
    ])
  }

  playDonation(treeCount: number) {
    if (treeCount >= 50) {
      this.playTones([
        { frequency: 261.63, offset: 0, duration: 0.2, wave: 'triangle' },
        { frequency: 329.63, offset: 0.08, duration: 0.22, wave: 'triangle' },
        { frequency: 392, offset: 0.16, duration: 0.24, wave: 'triangle' },
        { frequency: 523.25, offset: 0.26, duration: 0.34, volume: 0.2 },
        { frequency: 659.25, offset: 0.34, duration: 0.4, volume: 0.15 },
      ])
      return
    }

    if (treeCount >= 10) {
      this.playTones([
        { frequency: 293.66, offset: 0, duration: 0.16, wave: 'triangle' },
        { frequency: 392, offset: 0.1, duration: 0.2, wave: 'triangle' },
        { frequency: 493.88, offset: 0.2, duration: 0.26, volume: 0.18 },
        { frequency: 587.33, offset: 0.3, duration: 0.3, volume: 0.14 },
      ])
      return
    }

    if (treeCount >= 5) {
      this.playTones([
        { frequency: 329.63, offset: 0, duration: 0.16, wave: 'triangle' },
        { frequency: 440, offset: 0.1, duration: 0.2, wave: 'triangle' },
        { frequency: 554.37, offset: 0.2, duration: 0.25, volume: 0.16 },
      ])
      return
    }

    this.playTones([
      { frequency: 220, offset: 0, duration: 0.09, volume: 0.2, wave: 'triangle' },
      { frequency: 349.23, offset: 0.06, duration: 0.16, volume: 0.14 },
    ])
  }

  destroy() {
    this.music?.pause()
    if (this.music) { this.music.removeAttribute('src'); this.music.load() }
    this.music = undefined
    void this.context?.close()
    this.context = undefined
    this.masterGain = undefined
  }

  private updateMasterGain() {
    if (this.music) {
      this.music.muted = this.muted
      this.music.volume = this.volume * 0.65
    }
    if (!this.context || !this.masterGain) return
    const output = this.muted ? 0 : this.volume
    this.masterGain.gain.setTargetAtTime(output, this.context.currentTime, 0.02)
  }

  private playTones(tones: Tone[]) {
    if (!this.context || !this.masterGain || this.context.state !== 'running' || this.muted) return
    const startTime = this.context.currentTime

    tones.forEach((tone) => {
      const oscillator = this.context!.createOscillator()
      const envelope = this.context!.createGain()
      const toneStart = startTime + tone.offset
      const toneEnd = toneStart + tone.duration

      oscillator.type = tone.wave ?? 'sine'
      oscillator.frequency.setValueAtTime(tone.frequency, toneStart)
      envelope.gain.setValueAtTime(0.0001, toneStart)
      envelope.gain.exponentialRampToValueAtTime(tone.volume ?? 0.16, toneStart + 0.025)
      envelope.gain.exponentialRampToValueAtTime(0.0001, toneEnd)
      oscillator.connect(envelope)
      envelope.connect(this.masterGain!)
      oscillator.start(toneStart)
      oscillator.stop(toneEnd + 0.02)
      oscillator.addEventListener('ended', () => {
        oscillator.disconnect()
        envelope.disconnect()
      }, { once: true })
    })
  }
}
