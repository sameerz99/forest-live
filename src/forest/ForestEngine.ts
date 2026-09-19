import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { Ticker } from 'pixi.js'
import type { PlantedTree, TreeKind } from '../types/forest'
import {
  projectWorld,
  treeToWorld,
  variationFromId,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type WorldPoint,
} from './WorldLayout'

type DetailKind = 'bush' | 'rock' | 'grass' | 'flower' | 'log'

const details: Array<WorldPoint & { kind: DetailKind }> = [
  { x: -0.78, depth: 0.23, kind: 'bush' },
  { x: 0.72, depth: 0.25, kind: 'rock' },
  { x: -0.3, depth: 0.3, kind: 'flower' },
  { x: 0.36, depth: 0.34, kind: 'grass' },
  { x: -0.56, depth: 0.43, kind: 'grass' },
  { x: 0.65, depth: 0.48, kind: 'flower' },
  { x: -0.18, depth: 0.54, kind: 'rock' },
  { x: 0.18, depth: 0.58, kind: 'grass' },
  { x: -0.76, depth: 0.65, kind: 'rock' },
  { x: 0.78, depth: 0.7, kind: 'bush' },
  { x: -0.4, depth: 0.82, kind: 'log' },
  { x: 0.5, depth: 0.87, kind: 'flower' },
  { x: -0.7, depth: 0.92, kind: 'flower' },
  { x: 0.08, depth: 0.94, kind: 'rock' },
]

export class ForestEngine {
  private app = new Application()
  private terrain = new Container()
  private objects = new Container()
  private foreground = new Container()
  private renderedTreeIds = new Set<string>()
  private treeVisuals = new Map<string, { root: Container; scaledObject?: Container }>()
  private treeTickers = new Map<string, (ticker: Ticker) => void>()
  private depthScaledObjects = new Map<Container, number>()
  private resizeObserver?: ResizeObserver
  private aspectCorrection = 1
  private destroyed = false
  private initialized = false
  private treeTextures = new Map<string, Texture>()

  async mount(host: HTMLElement, trees: PlantedTree[]) {
    await this.app.init({
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      antialias: false,
      background: '#4e963e',
      resolution: 1,
      autoDensity: false,
    })
    this.initialized = true

    if (this.destroyed) {
      this.app.destroy()
      return
    }

    this.app.canvas.className = 'forest-canvas'
    this.app.canvas.setAttribute('aria-label', 'A cozy pixel-art growing forest')
    host.appendChild(this.app.canvas)
    this.updateAspectCorrection(host)
    this.resizeObserver = new ResizeObserver(() => this.updateAspectCorrection(host))
    this.resizeObserver.observe(host)

    this.objects.sortableChildren = true
    this.app.stage.addChild(
      this.createGround(),
      this.terrain,
      this.objects,
      this.foreground,
    )
    this.drawForestFloor()
    this.drawDetails()
    this.drawForeground()
    trees.forEach((tree) => this.addMatureTree(tree))
  }

  plant(tree: PlantedTree) {
    if (!this.initialized || this.renderedTreeIds.has(tree.id)) return
    this.renderedTreeIds.add(tree.id)

    const point = projectWorld(treeToWorld(tree))
    const variation = variationFromId(tree.id)
    const finalScale = point.scale * (0.86 + variation * 0.14)
    const root = new Container()
    root.position.set(Math.round(point.x), Math.round(point.y))
    root.zIndex = point.zIndex
    this.objects.addChild(root)
    this.treeVisuals.set(tree.id, { root })

    const landingShadow = this.createPixelShadow(18, 5, 0.18)
    landingShadow.scale.x = 1 / this.aspectCorrection
    const seed = new Graphics().rect(-2, -4, 4, 5).fill('#6c4932').rect(1, -3, 2, 2).fill('#a37743')
    seed.y = -150
    seed.scale.x = 1 / this.aspectCorrection
    const sprout = this.createSprout()
    const sapling = this.createSapling(tree.kind)
    sprout.visible = false
    sapling.visible = false
    root.addChild(landingShadow, seed, sprout, sapling)

    let matureTree: Container | undefined
    let elapsed = 0
    const tick = (ticker: Ticker) => {
      elapsed += ticker.deltaMS

      seed.visible = elapsed < 500
      sprout.visible = elapsed >= 500 && elapsed < 850
      sapling.visible = elapsed >= 850 && elapsed < 1180

      if (seed.visible) {
        const progress = elapsed / 500
        seed.y = Math.round(-150 * (1 - progress * progress))
      }
      if (sprout.visible) this.applyCorrectedScale(sprout, finalScale)
      if (sapling.visible) this.applyCorrectedScale(sapling, finalScale)

      if (elapsed >= 1180 && !matureTree) {
        matureTree = this.createTree(tree.kind, variation, point.prominence)
        root.addChild(matureTree)
        const visual = this.treeVisuals.get(tree.id)
        if (visual) visual.scaledObject = matureTree
      }

      if (matureTree) {
        const frame = Math.min(1, (elapsed - 1180) / 300)
        const steppedGrowth = frame < 0.34 ? 0.65 : frame < 0.68 ? 0.84 : 1
        this.applyCorrectedScale(matureTree, finalScale * steppedGrowth)
      }

      if (elapsed >= 1500 && matureTree) {
        this.app.ticker.remove(tick)
        this.treeTickers.delete(tree.id)
        this.registerDepthScale(matureTree, finalScale)
        landingShadow.visible = false
        sprout.destroy()
        sapling.destroy()
        seed.destroy()
        this.releasePixelSparkles(root, finalScale)
      }
    }
    this.treeTickers.set(tree.id, tick)
    this.app.ticker.add(tick)
  }

  addMatureTree(tree: PlantedTree) {
    if (this.renderedTreeIds.has(tree.id)) return
    this.renderedTreeIds.add(tree.id)
    const point = projectWorld(treeToWorld(tree))
    const variation = variationFromId(tree.id)
    const graphic = this.createTree(tree.kind, variation, point.prominence)
    graphic.position.set(Math.round(point.x), Math.round(point.y))
    this.registerDepthScale(graphic, point.scale * (0.86 + variation * 0.14))
    graphic.alpha = 1
    graphic.zIndex = point.zIndex
    this.objects.addChild(graphic)
    this.treeVisuals.set(tree.id, { root: graphic, scaledObject: graphic })
  }

  removeTree(treeId: string) {
    const visual = this.treeVisuals.get(treeId)
    if (!visual) return
    const ticker = this.treeTickers.get(treeId)
    if (ticker) {
      this.app.ticker.remove(ticker)
      this.treeTickers.delete(treeId)
    }
    if (visual.scaledObject) this.depthScaledObjects.delete(visual.scaledObject)
    visual.root.destroy({ children: true })
    this.treeVisuals.delete(treeId)
    this.renderedTreeIds.delete(treeId)
  }

  clearTrees() {
    Array.from(this.treeVisuals.keys()).forEach((treeId) => this.removeTree(treeId))
  }

  destroy() {
    this.destroyed = true
    if (!this.initialized) return
    this.resizeObserver?.disconnect()
    this.app.destroy({ removeView: true }, { children: true })
    this.treeTextures.forEach(texture => texture.destroy(true))
    this.treeTextures.clear()
  }

  private createGround() {
    const g = new Graphics().rect(0, 0, 960, 540).fill('#4e963e')
    const colors = ['#438b3b', '#589e40', '#62a644', '#39843b', '#70ad47']
    for (let i=0; i<850; i++) {
      const x=(i*137+i*i*7)%960, y=(i*79+i*i*3)%540
      g.rect(x,y,8+i%33,3+i%9).fill({color:colors[i%5],alpha:0.55})
    }
    return g
  }

  private drawForestFloor() {
    const g = new Graphics()
    for (let i=0; i<330; i++) {
      const x=(i*193+17)%950, y=(i*113+23)%535
      g.rect(x,y,3,2).fill(i%3 ? '#83b84a' : '#2e7939')
      if(i%4===0) g.rect(x+4,y-3,2,5).fill('#2c7837').rect(x-2,y-2,2,4).fill('#388335')
      if(i%11===0) g.rect(x,y-5,2,6).fill('#246c37').rect(x-1,y-7,4,3).fill(i%2 ? '#ffe277' : '#f5f1c8')
    }
    this.terrain.addChild(g)
    for(let i=0;i<48;i++) {
      const d=this.createDetail(i%3 ? 'grass' : 'bush',i)
      d.position.set(i%2 ? 950-i%19 : i%19,(i*83)%540)
      this.registerDepthScale(d,1.3)
      this.terrain.addChild(d)
    }
  }

  private drawDetails() {
    details.forEach((detail, index) => {
      const point = projectWorld(detail)
      const graphic = this.createDetail(detail.kind, index)
      graphic.position.set(Math.round(point.x), Math.round(point.y))
      this.registerDepthScale(graphic, point.scale * 0.75)
      graphic.zIndex = point.zIndex
      this.objects.addChild(graphic)
    })
  }

  private drawForeground() {
    this.foreground.addChild(
      new Graphics()
        .poly([0, 540, 0, 516, 8, 516, 8, 506, 13, 516, 18, 500, 23, 516, 31, 508, 31, 540])
        .fill('#3f8248')
        .poly([960, 540, 960, 514, 952, 514, 952, 502, 946, 514, 941, 499, 936, 516, 928, 508, 928, 540])
        .fill('#3f8248'),
    )
  }

  private createTree(kind: TreeKind, variation: number, prominence: number) {
    const tree = new Container()
    tree.addChild(this.createPixelShadow(kind === 'pine' ? 31 : 39, 10, 0.2 + prominence * 0.08))
    const key = kind + (variation > 0.5 ? '-1' : '-0')
    let texture = this.treeTextures.get(key)
    if (!texture) {
      const body = new Container()
      if (kind === 'pine') this.drawPine(body, variation)
      else this.drawBroadleaf(body, kind === 'birch', variation)
      texture = this.app.renderer.generateTexture({ target: body, resolution: 1 })
      texture.source.scaleMode = 'nearest'
      this.treeTextures.set(key, texture)
      body.destroy({ children: true })
    }
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5, 1)
    tree.addChild(sprite)
    return tree
  }

  private drawPine(body: Container, variation: number) {
    const g = new Graphics()
    g.poly([-12,0,-7,-8,-6,-36,6,-36,7,-7,14,0]).fill('#513921')
      .rect(-3,-32,5,31).fill('#ac7134').rect(-3,-21,2,16).fill('#d29446')
    for (let tier=0;tier<5;tier++) {
      const y=-23-tier*17, w=43-tier*7
      g.poly([0,y-35,-w+12,y-9,-w+17,y-9,-w,y,-w+13,y+2,-w+9,y+7,-8,y+3,0,y+9,12,y+3,w-7,y+7,w-12,y+1,w,y-1,w-17,y-12,w-12,y-12]).fill('#123e32')
      g.poly([0,y-32,-w+16,y-8,-w+20,y-8,-w+7,y-1,-8,y-3,0,y+3,8,y-4,w-10,y]).fill(variation>0.5 ? '#216943' : '#236c49')
      g.poly([-1,y-29,-w+21,y-8,-10,y-10,-16,y-2,-3,y-7,1,y-2]).fill('#438f4f')
      g.rect(-4,y-23,4,4).fill('#8abc58').rect(-12,y-10,5,3).fill('#68a952')
    }
    body.addChild(g)
  }

  private drawBroadleaf(body: Container, birch: boolean, variation: number) {
    const g = new Graphics()
    g.poly([-17,0,-8,-9,-9,-35,-23,-52,-17,-57,-2,-42,11,-58,18,-55,6,-32,8,-10,19,0,5,-3,-2,1,-7,-3]).fill(birch ? '#556b52' : '#45391e')
    g.poly([-10,-2,-4,-13,-5,-37,-19,-53,-16,-54,0,-38,13,-55,15,-53,2,-30,3,-9,11,-2,0,-5]).fill(birch ? '#e6e7c7' : '#855025')
    g.rect(-3,-31,3,23).fill(birch ? '#ffffdf' : '#c58940')
    if(birch) for(let i=0;i<5;i++) g.rect(-5+i%2*3,-8-i*7,4,2).fill('#43594c')
    const clumps=birch
      ? [[-24,-58,16],[24,-60,16],[-14,-78,19],[12,-83,20],[-2,-101,16]]
      : [[-32,-52,19],[30,-53,21],[-11,-58,23],[12,-61,24],[-32,-73,19],[31,-75,20],[-13,-85,22],[12,-88,22],[0,-99,17]]
    const palette=birch ? ['#38643a','#598d3e','#8db344','#bad75b','#e0e988'] : ['#194d32','#286b36','#498d34','#79ad3c','#b4d556']
    for(const [cx,cy,radius] of clumps) {
      const x=birch ? Math.round(cx*0.8) : cx, r=birch ? radius-3 : radius
      g.poly([x-r,cy-5,x-r+4,cy-5,x-r+4,cy-r+5,x-6,cy-r+5,x-6,cy-r,x+7,cy-r,x+7,cy-r+4,x+r-3,cy-r+4,x+r-3,cy-6,x+r,cy-6,x+r,cy+5,x+r-5,cy+5,x+r-5,cy+11,x-8,cy+11,x-8,cy+8,x-r,cy+8]).fill(palette[0])
      g.poly([x-r+3,cy-5,x-r+7,cy-r+5,x-5,cy-r+2,x+7,cy-r+4,x+r-5,cy-6,x+r-4,cy+3,x+6,cy+7,x-9,cy+4]).fill(palette[1])
      g.poly([x-r+6,cy-6,x-r+9,cy-r+7,x-4,cy-r+3,x+6,cy-r+6,x+9,cy-5,x+1,cy-1,x-7,cy+1]).fill(palette[2])
      g.rect(x-r+9,cy-r+8,6,5).fill(palette[3]).rect(x-5,cy-r+5,7,4).fill(palette[3]).rect(x-4,cy-r+5,3,2).fill(palette[4])
      for(let j=0;j<5;j++) {
        const px=x-r+5+(j*7+Math.round(variation*9))%(r*2-10), py=cy-r+8+(j*5)%Math.max(5,r-5)
        g.rect(px,py,3,3).fill(palette[2+j%3])
      }
    }
    body.addChild(g)
  }

  private createSprout() {
    return new Container({
      children: [
        new Graphics().rect(-1, -10, 2, 11).fill('#397847')
          .rect(-6, -9, 5, 4).fill('#5e9e50').rect(1, -13, 6, 4).fill('#76b45a'),
      ],
    })
  }

  private createSapling(kind: TreeKind) {
    const sapling = new Container()
    sapling.addChild(
      new Graphics().rect(-2, -21, 4, 22).fill(kind === 'birch' ? '#ece2ca' : '#795136'),
      kind === 'pine'
        ? new Graphics().poly([0, -38, -12, -18, -6, -18, -16, -7, 0, -12, 16, -7, 6, -18, 12, -18]).fill('#32734a')
        : new Graphics().poly([-13, -17, -17, -25, -10, -33, 0, -36, 12, -32, 17, -23, 12, -15]).fill(kind === 'birch' ? '#80ac5c' : '#3c7d49'),
    )
    return sapling
  }

  private createDetail(kind: DetailKind, variation: number) {
    const detail = new Container()
    if (kind === 'bush') {
      detail.addChild(new Graphics().rect(-13, -7, 26, 8).fill('#2f6f46').rect(-10, -12, 11, 7).fill('#57964f').rect(1, -10, 10, 6).fill('#65a157').rect(-5, -13, 4, 3).fill('#7db160'))
    } else if (kind === 'rock') {
      detail.addChild(new Graphics().poly([-11, 0, -9, -8, -3, -13, 7, -11, 12, -5, 12, 0]).fill('#6f8378').poly([-7, -7, -2, -11, 6, -9, 2, -5, -6, -5]).fill('#a8b39d').rect(5, -4, 5, 3).fill('#596f68'))
    } else if (kind === 'grass') {
      detail.addChild(new Graphics().poly([-11, 0, -9, -12, -4, -4, -1, -16, 3, -4, 9, -13, 8, 0]).fill('#357d47').rect(-1, -8, 3, 8).fill('#57984e'))
    } else if (kind === 'flower') {
      const flower = new Graphics()
      for (let index = 0; index < 5; index += 1) {
        const x = -10 + index * 5
        flower.rect(x, -8 - (index % 2) * 3, 1, 9).fill('#397847')
          .rect(x - 1, -10 - (index % 2) * 3, 3, 3).fill(index % 2 ? '#f1c66e' : '#f5e9c3')
      }
      detail.addChild(flower)
    } else {
      detail.addChild(new Graphics().rect(-15, -7, 30, 8).fill('#6e4b33').rect(-12, -9, 24, 3).fill('#8b6139').rect(11, -6, 4, 6).fill('#b28354'))
      detail.rotation = variation % 2 ? 0.08 : -0.08
    }
    return detail
  }

  private createPixelShadow(width: number, height: number, alpha: number) {
    return new Graphics().poly([-width, -height / 2, -width + 5, -height, width - 5, -height, width, -height / 2, width - 5, 0, -width + 5, 0]).fill({ color: '#244b38', alpha })
  }

  private releasePixelSparkles(parent: Container, scale: number) {
    const particles = Array.from({ length: 8 }, (_, index) => {
      const angle = (index / 8) * Math.PI * 2
      const particle = new Graphics().rect(-2, -2, 4, 4).fill(index % 2 ? '#f4d66f' : '#f5f0c5')
      particle.position.set(Math.cos(angle) * 8, -42 * scale + Math.sin(angle) * 8)
      parent.addChild(particle)
      return { particle, dx: Math.cos(angle) * 0.7, dy: Math.sin(angle) * 0.7 - 0.3 }
    })
    let elapsed = 0
    const tick = (ticker: Ticker) => {
      elapsed += ticker.deltaMS
      if (parent.destroyed) { this.app.ticker.remove(tick); return }
      particles.forEach(({ particle, dx, dy }) => {
        particle.x = Math.round(particle.x + dx * ticker.deltaTime)
        particle.y = Math.round(particle.y + dy * ticker.deltaTime)
        particle.visible = Math.floor(elapsed / 100) % 2 === 0
      })
      if (elapsed >= 700) {
        this.app.ticker.remove(tick)
        particles.forEach(({ particle }) => particle.destroy())
      }
    }
    this.app.ticker.add(tick)
  }

  private registerDepthScale(container: Container, scale: number) {
    this.depthScaledObjects.set(container, scale)
    this.applyCorrectedScale(container, scale)
  }

  private applyCorrectedScale(container: Container, scale: number) {
    container.scale.set(scale / this.aspectCorrection, scale)
  }

  private updateAspectCorrection(host: HTMLElement) {
    const { width, height } = host.getBoundingClientRect()
    if (width <= 0 || height <= 0) return
    this.aspectCorrection = (width / WORLD_WIDTH) / (height / WORLD_HEIGHT)
    this.depthScaledObjects.forEach((scale, container) => this.applyCorrectedScale(container, scale))
  }

}
