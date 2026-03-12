import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { AssistantPlayer } from '../core/player'
import type {
  AssistantPlayerState,
  CharacterName,
  PlayOptions,
  SetCharacterOptions
} from '../core/types'

export interface AssistantSpriteHandle {
  ready(): Promise<void>
  play(animation: string, options?: PlayOptions): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  setCharacter(character: CharacterName, options?: SetCharacterOptions): Promise<void>
  getState(): AssistantPlayerState
}

export interface AssistantSpriteProps {
  character: CharacterName
  animation?: string
  playing?: boolean
  loop?: boolean
  speed?: number
  scale?: number
  className?: string
  style?: CSSProperties
  onAnimationEnd?: () => void
}

export const AssistantSprite = forwardRef<AssistantSpriteHandle, AssistantSpriteProps>(
  function AssistantSprite(
    {
      character,
      animation,
      playing = true,
      loop,
      speed = 1,
      scale = 1,
      className,
      style,
      onAnimationEnd
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const playerRef = useRef<AssistantPlayer | null>(null)
    const [state, setState] = useState<AssistantPlayerState>({
      ready: false,
      playing,
      character,
      animation: animation ?? null,
      canvasSize: { width: 0, height: 0 }
    })

    if (playerRef.current === null) {
      playerRef.current = new AssistantPlayer({ character, animation, speed })
    }

    useEffect(() => {
      const player = playerRef.current!
      return player.subscribe(() => {
        setState(player.getState())
      })
    }, [])

    useEffect(() => {
      const player = playerRef.current!
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      player.attach(canvas)
      return () => {
        player.detach()
      }
    }, [])

    useEffect(() => {
      const player = playerRef.current!
      void player.setCharacter(character, {
        animation,
        loop,
        onComplete: onAnimationEnd
      })
    }, [character, animation, loop, onAnimationEnd])

    useEffect(() => {
      playerRef.current!.setPlaybackRate(speed)
    }, [speed])

    useEffect(() => {
      const player = playerRef.current!
      if (playing) {
        player.resume()
      } else {
        player.pause()
      }
    }, [playing])

    useImperativeHandle(
      ref,
      () => ({
        ready: () => playerRef.current!.ready(),
        play: (nextAnimation, options) => playerRef.current!.play(nextAnimation, options),
        pause: () => playerRef.current!.pause(),
        resume: () => playerRef.current!.resume(),
        stop: () => playerRef.current!.stop(),
        setCharacter: (nextCharacter, options) => playerRef.current!.setCharacter(nextCharacter, options),
        getState: () => playerRef.current!.getState()
      }),
      []
    )

    const width = state.canvasSize.width * Math.max(scale, 1)
    const height = state.canvasSize.height * Math.max(scale, 1)

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          display: 'block',
          width: width > 0 ? `${width}px` : undefined,
          height: height > 0 ? `${height}px` : undefined,
          imageRendering: 'pixelated',
          ...style
        }}
      />
    )
  }
)
