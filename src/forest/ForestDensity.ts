import type { PlantedTree } from '../types/forest'

/** The largest number of mature trees kept in the Pixi scene at once. */
export const MAX_PERSISTENT_TREES = 100

/**
 * Returns the stable representative set used when an existing forest loads.
 * Donation totals remain uncapped; this only controls visual complexity.
 */
export function selectPersistentTrees(trees: PlantedTree[]) {
  return trees.slice(-MAX_PERSISTENT_TREES)
}

/**
 * Large gifts should feel active without launching dozens of simultaneous
 * growth animations. Evenly samples the donation while preserving its ends.
 */
export function selectAnimatedDonationTrees(trees: PlantedTree[]) {
  const animationLimit =
    trees.length >= 25 ? 8 : trees.length >= 10 ? 5 : trees.length >= 5 ? 3 : trees.length
  if (trees.length <= animationLimit) return trees

  return Array.from({ length: animationLimit }, (_, index) => {
    const sourceIndex = Math.round((index / (animationLimit - 1)) * (trees.length - 1))
    return trees[sourceIndex]
  })
}
