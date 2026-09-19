import type { PlantedTree } from '../types/forest'

export const WORLD_WIDTH = 960
export const WORLD_HEIGHT = 540

export interface WorldPoint {
  /** Horizontal position across the clearing, from -1 (left) to 1 (right). */
  x: number
  /** Position from the back (0) to the front (1) of the ground plane. */
  depth: number
}

export interface ProjectedPoint {
  x: number
  y: number
  scale: number
  zIndex: number
  prominence: number
}

const HORIZON_Y = 115
const GROUND_DEPTH = 360
const SLOT_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16]
const plantingSlots = createPlantingSlots()

/**
 * Projects a point on the forest's ground plane into the elevated camera view.
 * The ground widens toward the viewer and objects become larger and stronger.
 */
export function projectWorld(point: WorldPoint): ProjectedPoint {
  const depth = clamp(point.depth, 0, 1)
  const halfWidth = 395 + depth * 38

  return {
    x: WORLD_WIDTH / 2 + clamp(point.x, -1, 1) * halfWidth,
    y: HORIZON_Y + depth * GROUND_DEPTH,
    scale: 0.78 + depth * 0.28,
    zIndex: 100 + Math.round(depth * 1000),
    prominence: 0.52 + depth * 0.48,
  }
}

/** Adapts persisted normalized tree positions to the reusable world plane. */
export function treeToWorld(tree: PlantedTree): WorldPoint {
  const index = tree.slotIndex ?? Math.floor(variationFromId(tree.id) * plantingSlots.length)
  return plantingSlots[index % plantingSlots.length]
}

export function variationFromId(id: string) {
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (Math.abs(hash) % 1000) / 1000
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createPlantingSlots(): WorldPoint[] {
  const slots: WorldPoint[] = []

  SLOT_ROWS.forEach((count, row) => {
    const depth = 0.08 + (row / (SLOT_ROWS.length - 1)) * 0.84
    const rowInset = 0.94 - row * 0.005
    for (let column = 0; column < count; column += 1) {
      let x = count === 1 ? 0 : -rowInset + (column / (count - 1)) * rowInset * 2
      x += (row % 2 ? 0.018 : -0.018) * (column % 2 ? 1 : -1)

      slots.push({ x: clamp(x, -0.88, 0.88), depth: depth + Math.sin(column * 4 + row * 7) * 0.025 })
    }
  })

  // Fill the clearing evenly before adding denser representatives. This order
  // is fixed, so new donations never move already planted trees.
  const remaining = slots.map(point => ({ point, distance: Infinity }))
  const ordered: WorldPoint[] = []
  let next = Math.floor(remaining.length / 2)
  while (remaining.length) {
    const [selected] = remaining.splice(next, 1)
    ordered.push(selected.point)
    let farthest = -1
    remaining.forEach((candidate, index) => {
      const dx = candidate.point.x - selected.point.x
      const dy = (candidate.point.depth - selected.point.depth) * 1.4
      candidate.distance = Math.min(candidate.distance, dx * dx + dy * dy)
      if (candidate.distance > farthest) { farthest = candidate.distance; next = index }
    })
  }
  return ordered
}
