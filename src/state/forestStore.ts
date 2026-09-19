import type { DonationEvent } from '../types/donation'
import type { ForestState, PlantedTree, TreeKind } from '../types/forest'

export interface ForestUpdate {
  state: ForestState
  plantedTrees: PlantedTree[]
  donation?: DonationEvent
  reset?: boolean
}

type Listener = (update: ForestUpdate) => void

const STORAGE_KEY = 'grow-the-forest-state-v1'
const CHANNEL_KEY = 'grow-the-forest-updates'
const treeKinds: TreeKind[] = ['pine', 'oak', 'birch']

const initialTrees: PlantedTree[] = Array.from({ length: 7 }, (_, index) =>
  createTree(index, `starter-${index}`),
)

function createTree(index: number, id: string): PlantedTree {
  const angle = index * 2.39996
  const radius = 0.18 + ((index * 37) % 58) / 100
  const x = 0.5 + Math.cos(angle) * radius * 0.43
  const y = 0.3 + Math.sin(angle) * radius * 0.24 + radius * 0.34

  return {
    id,
    kind: treeKinds[index % treeKinds.length],
    x: Math.min(0.88, Math.max(0.12, x)),
    y: Math.min(0.86, Math.max(0.29, y)),
    scale: 0.72 + y * 0.43,
    slotIndex: index,
  }
}

function defaultState(): ForestState {
  return { totalTrees: 7, targetTrees: 1000, trees: initialTrees, donors: [] }
}

function readState(): ForestState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultState()

    const state = JSON.parse(stored) as ForestState
    return {
      ...state,
      trees: state.trees.map((tree, index) => ({
        ...tree,
        slotIndex: tree.slotIndex ?? index,
      })),
    }
  } catch {
    return defaultState()
  }
}

class ForestStore {
  private state = readState()
  private listeners = new Set<Listener>()
  private channel =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_KEY)

  constructor() {
    this.channel?.addEventListener('message', (event: MessageEvent<ForestUpdate>) => {
      this.state = event.data.state
      this.emit(event.data)
    })
  }

  getSnapshot = (): ForestState => this.state

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  plant(donation: DonationEvent): ForestUpdate {
    const startIndex = this.state.trees.length
    const plantedTrees = Array.from({ length: donation.treeCount }, (_, offset) =>
      createTree(startIndex + offset, `${donation.id}-${offset}`),
    )
    const donorId = donation.donorName.trim().toLocaleLowerCase()
    const existingDonor = this.state.donors.find((donor) => donor.id === donorId)
    const donors = existingDonor
      ? this.state.donors.map((donor) =>
          donor.id === donorId
            ? { ...donor, treesContributed: donor.treesContributed + donation.treeCount }
            : donor,
        )
      : [
          ...this.state.donors,
          {
            id: donorId,
            name: donation.donorName.trim(),
            treesContributed: donation.treeCount,
          },
        ]

    this.state = {
      ...this.state,
      totalTrees: this.state.totalTrees + donation.treeCount,
      trees: [...this.state.trees, ...plantedTrees],
      donors,
    }

    const update = { state: this.state, plantedTrees, donation }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.emit(update)
    this.channel?.postMessage(update)
    return update
  }

  reset() {
    this.state = {
      totalTrees: 0,
      targetTrees: this.state.targetTrees,
      trees: [],
      donors: [],
    }
    const update: ForestUpdate = {
      state: this.state,
      plantedTrees: [],
      reset: true,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.emit(update)
    this.channel?.postMessage(update)
  }

  private emit(update: ForestUpdate) {
    this.listeners.forEach((listener) => listener(update))
  }
}

export const forestStore = new ForestStore()
