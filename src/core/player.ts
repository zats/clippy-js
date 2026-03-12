import { loadBuiltInCharacterPack } from './assets'
import type {
  AssistantAnimationClip,
  AssistantFrame,
  AssistantPlayerState,
  CharacterName,
  LoadedCharacterPack,
  PlayOptions,
  SetCharacterOptions
} from './types'

export interface AssistantPlayerOptions {
  character?: CharacterName
  animation?: string
  speed?: number
}

type Listener = () => void

export class AssistantPlayer {
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null
  private character: CharacterName
  private pack: LoadedCharacterPack | null = null
  private currentClip: AssistantAnimationClip | null = null
  private currentFrameIndex = 0
  private elapsedInFrame = 0
  private lastTimestamp = 0
  private frameRequest = 0
  private speed = 1
  private paused = false
  private loopOverride: boolean | null = null
  private completionCallback: (() => void) | null = null
  private listeners = new Set<Listener>()
  private currentAnimation: string | null

  constructor(options: AssistantPlayerOptions = {}) {
    this.character = options.character ?? 'clippy'
    this.currentAnimation = options.animation ?? null
    this.speed = Math.max(0.01, options.speed ?? 1)
  }

  getState(): AssistantPlayerState {
    return {
      ready: this.pack !== null,
      playing: !this.paused && this.currentClip !== null,
      character: this.character,
      animation: this.currentAnimation,
      canvasSize: this.pack?.manifest.frameCellSize ?? { width: 0, height: 0 }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: true })
    if (this.context) {
      this.context.imageSmoothingEnabled = false
    }
    this.syncCanvasSize()
    this.render()
  }

  detach(): void {
    this.stopLoop()
    this.canvas = null
    this.context = null
  }

  async ready(): Promise<void> {
    await this.ensurePack()
  }

  async setCharacter(character: CharacterName, options: SetCharacterOptions = {}): Promise<void> {
    this.character = character
    this.pack = null
    this.pack = await loadBuiltInCharacterPack(character)
    this.syncCanvasSize()

    const animationName =
      options.animation ??
      this.currentAnimation ??
      this.pack.manifest.animations[0]?.name ??
      null

    if (animationName) {
      await this.play(animationName, {
        loop: options.loop,
        restart: true,
        onComplete: options.onComplete
      })
      if (options.autoPlay === false) {
        this.pause()
      }
      return
    }

    this.currentClip = null
    this.currentAnimation = null
    this.currentFrameIndex = 0
    this.elapsedInFrame = 0
    this.emit()
    this.render()
  }

  async play(animation: string, options: PlayOptions = {}): Promise<void> {
    const pack = await this.ensurePack()
    const clip = pack.manifest.animations.find((candidate) => candidate.name === animation)

    if (!clip) {
      throw new Error(`Unknown ${pack.displayName} animation "${animation}".`)
    }

    const shouldRestart = options.restart ?? true
    this.currentAnimation = animation
    this.currentClip = clip
    this.loopOverride = options.loop ?? null
    this.completionCallback = options.onComplete ?? null
    this.paused = false

    if (shouldRestart) {
      this.currentFrameIndex = 0
      this.elapsedInFrame = 0
      this.lastTimestamp = 0
    } else {
      this.currentFrameIndex = Math.min(this.currentFrameIndex, Math.max(clip.frameCount - 1, 0))
    }

    this.emit()
    this.render()
    this.startLoop()
  }

  pause(): void {
    this.paused = true
    this.stopLoop()
    this.emit()
  }

  resume(): void {
    if (!this.currentClip) {
      return
    }
    this.paused = false
    this.emit()
    this.startLoop()
  }

  stop(): void {
    this.pause()
    this.currentFrameIndex = 0
    this.elapsedInFrame = 0
    this.render()
  }

  setPlaybackRate(speed: number): void {
    this.speed = Math.max(0.01, speed)
  }

  destroy(): void {
    this.detach()
    this.listeners.clear()
    this.completionCallback = null
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private async ensurePack(): Promise<LoadedCharacterPack> {
    if (this.pack) {
      return this.pack
    }

    this.pack = await loadBuiltInCharacterPack(this.character)
    this.syncCanvasSize()
    this.emit()
    this.render()
    return this.pack
  }

  private currentFrame(): AssistantFrame | null {
    if (!this.pack || !this.currentClip) {
      return null
    }

    const globalIndex = this.currentClip.startFrame + this.currentFrameIndex
    return this.pack.manifest.frames[globalIndex] ?? null
  }

  private syncCanvasSize(): void {
    if (!this.canvas || !this.pack) {
      return
    }

    this.canvas.width = this.pack.manifest.frameCellSize.width
    this.canvas.height = this.pack.manifest.frameCellSize.height
  }

  private render(): void {
    if (!this.context || !this.canvas || !this.pack) {
      return
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const frame = this.currentFrame()
    if (!frame) {
      return
    }

    const source = frame.sourceRect
    this.context.drawImage(
      this.pack.atlasImage,
      source.x,
      source.y,
      source.width,
      source.height,
      frame.offset.x,
      frame.offset.y,
      frame.size.width,
      frame.size.height
    )
  }

  private startLoop(): void {
    if (this.frameRequest !== 0 || this.paused || !this.currentClip) {
      return
    }

    const step = (timestamp: number) => {
      if (this.paused || !this.currentClip) {
        this.frameRequest = 0
        return
      }

      if (this.lastTimestamp === 0) {
        this.lastTimestamp = timestamp
      }

      const deltaSeconds = ((timestamp - this.lastTimestamp) / 1000) * this.speed
      this.lastTimestamp = timestamp
      this.advance(deltaSeconds)
      this.render()
      this.frameRequest = window.requestAnimationFrame(step)
    }

    this.frameRequest = window.requestAnimationFrame(step)
  }

  private stopLoop(): void {
    if (this.frameRequest === 0) {
      return
    }

    window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = 0
    this.lastTimestamp = 0
  }

  private advance(deltaSeconds: number): void {
    if (!this.currentClip || !this.pack || deltaSeconds <= 0) {
      return
    }

    let remaining = deltaSeconds
    const frameCount = this.currentClip.frameCount

    while (remaining > 0 && this.currentClip) {
      const frame = this.currentFrame()
      if (!frame) {
        return
      }

      const frameDuration = Math.max(frame.duration, 1 / 120)
      const timeToAdvance = frameDuration - this.elapsedInFrame

      if (remaining < timeToAdvance) {
        this.elapsedInFrame += remaining
        return
      }

      remaining -= timeToAdvance
      this.elapsedInFrame = 0

      const nextFrameIndex = this.currentFrameIndex + 1
      if (nextFrameIndex < frameCount) {
        this.currentFrameIndex = nextFrameIndex
        continue
      }

      const shouldLoop = this.loopOverride ?? this.currentClip.loops
      if (shouldLoop) {
        this.currentFrameIndex = 0
        continue
      }

      this.currentFrameIndex = Math.max(frameCount - 1, 0)
      this.pause()
      const callback = this.completionCallback
      this.completionCallback = null
      callback?.()
      return
    }
  }
}

export function createAssistantPlayer(options: AssistantPlayerOptions = {}): AssistantPlayer {
  return new AssistantPlayer(options)
}
