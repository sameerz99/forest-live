import type { DonationEvent, DonationInput } from '../types/donation'
import { forestStore } from './forestStore'

export function registerDonation(input: DonationInput): DonationEvent {
  const donorName = input.donorName.trim() || 'Anonymous'
  const event: DonationEvent = {
    ...input,
    donorName,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  }

  forestStore.plant(event)
  return event
}

export function resetForest() {
  forestStore.reset()
}
