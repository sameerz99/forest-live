export interface DonationInput {
  donorName: string
  treeCount: number
  source: 'admin' | 'tiktok'
}

export interface DonationEvent extends DonationInput {
  id: string
  timestamp: number
}
