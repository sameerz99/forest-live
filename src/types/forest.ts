export type TreeKind = 'pine' | 'oak' | 'birch'

export interface PlantedTree {
  id: string
  kind: TreeKind
  x: number
  y: number
  scale: number
  /** Stable index into the visual planting-slot bank. */
  slotIndex?: number
}

export interface Donor {
  id: string
  name: string
  treesContributed: number
}

export interface ForestState {
  totalTrees: number
  targetTrees: number
  trees: PlantedTree[]
  donors: Donor[]
}
