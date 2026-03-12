export const assistantCharacters = ['clippy', 'cat', 'rocky'] as const

export type CharacterName = (typeof assistantCharacters)[number]

export interface IntPoint {
  x: number
  y: number
}

export interface IntSize {
  width: number
  height: number
}

export interface IntRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AssistantFrame {
  index: number
  imageName: string
  sourceRect: IntRect
  trimmedRect: IntRect
  offset: IntPoint
  size: IntSize
  duration: number
}

export interface AssistantAnimationClip {
  name: string
  startFrame: number
  frameCount: number
  loops: boolean
}

export interface AssistantManifest {
  characterName: string
  frameCellSize: IntSize
  frames: AssistantFrame[]
  animations: AssistantAnimationClip[]
}

export interface LoadedCharacterPack {
  character: CharacterName
  displayName: string
  atlasUrl: string
  manifestUrl: string
  manifest: AssistantManifest
  atlasImage: HTMLImageElement
}

export interface PlayOptions {
  loop?: boolean
  restart?: boolean
  onComplete?: () => void
}

export interface SetCharacterOptions {
  animation?: string
  autoPlay?: boolean
  loop?: boolean
  onComplete?: () => void
}

export interface AssistantPlayerState {
  ready: boolean
  playing: boolean
  character: CharacterName
  animation: string | null
  canvasSize: IntSize
}
