import { useEffect, useRef } from 'react'
import {
  MAX_PERSISTENT_TREES,
  selectAnimatedDonationTrees,
  selectPersistentTrees,
} from '../../forest/ForestDensity'
import { ForestEngine } from '../../forest/ForestEngine'
import { forestStore } from '../../state/forestStore'
import type { PlantedTree } from '../../types/forest'

export function ForestCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hostRef.current) return

    const engine = new ForestEngine()
    let ready = false
    const initialTrees = selectPersistentTrees(forestStore.getSnapshot().trees)
    const retainedTreeIds = initialTrees.map((tree) => tree.id)
    const queuedDonations: PlantedTree[][] = []
    let resetBeforeReady = false

    function renderDonation(plantedTrees: PlantedTree[]) {
      const animatedIds = new Set(
        selectAnimatedDonationTrees(plantedTrees).map((tree) => tree.id),
      )

      plantedTrees.forEach((tree) => {
        if (retainedTreeIds.length >= MAX_PERSISTENT_TREES) {
          const oldestTreeId = retainedTreeIds.shift()
          if (oldestTreeId) engine.removeTree(oldestTreeId)
        }
        retainedTreeIds.push(tree.id)

        if (animatedIds.has(tree.id)) {
          engine.plant(tree)
        }
        else engine.addMatureTree(tree)
      })
    }

    const unsubscribe = forestStore.subscribe(({ plantedTrees, reset }) => {
      if (reset) {
        retainedTreeIds.splice(0, retainedTreeIds.length)
        if (ready) engine.clearTrees()
        else {
          resetBeforeReady = true
          queuedDonations.splice(0, queuedDonations.length)
        }
        return
      }
      if (ready) renderDonation(plantedTrees)
      else queuedDonations.push(plantedTrees)
    })

    void engine.mount(hostRef.current, initialTrees).then(() => {
      ready = true
      if (resetBeforeReady) engine.clearTrees()
      queuedDonations.forEach(renderDonation)
    })

    return () => {
      unsubscribe()
      engine.destroy()
    }
  }, [])

  return <div className="forest-canvas-host" ref={hostRef} />
}
