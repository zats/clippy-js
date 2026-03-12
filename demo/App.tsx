import { AssistantSprite, builtInCharacterPacks } from 'clippy-js'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import blissBackground from '../../clippy-swift/Sources/ClippySwiftDemo/Resources/bliss.png'
import blissBackgroundNight from '../../clippy-swift/Sources/ClippySwiftDemo/Resources/bliss_at_night.png'

type DemoSprite = {
  id: string
  label: string
  character: 'clippy' | 'cat' | 'rocky'
  row: 'top' | 'upper' | 'lower' | 'bottom'
  column: 'farLeft' | 'left' | 'right' | 'farRight'
  scale: number
}

type SpritePhase = 'entering' | 'idle' | 'exiting'

type ActiveDemoSprite = DemoSprite & {
  animation: string
  phase: SpritePhase
}

const assistantCharacters = ['clippy', 'cat', 'rocky'] as const

const sprites: DemoSprite[] = [
  { id: 'r1c1', label: 'Top Far Left', character: 'clippy', row: 'top', column: 'farLeft', scale: 1.15 },
  { id: 'r1c2', label: 'Top Left', character: 'cat', row: 'top', column: 'left', scale: 1.05 },
  { id: 'r1c3', label: 'Top Right', character: 'rocky', row: 'top', column: 'right', scale: 1.05 },
  { id: 'r1c4', label: 'Top Far Right', character: 'clippy', row: 'top', column: 'farRight', scale: 1.15 },
  { id: 'r2c1', label: 'Upper Far Left', character: 'cat', row: 'upper', column: 'farLeft', scale: 1.05 },
  { id: 'r2c2', label: 'Upper Left', character: 'rocky', row: 'upper', column: 'left', scale: 1.1 },
  { id: 'r2c3', label: 'Upper Right', character: 'clippy', row: 'upper', column: 'right', scale: 1.1 },
  { id: 'r2c4', label: 'Upper Far Right', character: 'cat', row: 'upper', column: 'farRight', scale: 1.05 },
  { id: 'r3c1', label: 'Lower Far Left', character: 'rocky', row: 'lower', column: 'farLeft', scale: 1.1 },
  { id: 'r3c2', label: 'Lower Left', character: 'clippy', row: 'lower', column: 'left', scale: 1.15 },
  { id: 'r3c3', label: 'Lower Right', character: 'cat', row: 'lower', column: 'right', scale: 1.05 },
  { id: 'r3c4', label: 'Lower Far Right', character: 'rocky', row: 'lower', column: 'farRight', scale: 1.1 },
  { id: 'r4c1', label: 'Bottom Far Left', character: 'clippy', row: 'bottom', column: 'farLeft', scale: 1.15 },
  { id: 'r4c2', label: 'Bottom Left', character: 'cat', row: 'bottom', column: 'left', scale: 1.05 },
  { id: 'r4c3', label: 'Bottom Right', character: 'rocky', row: 'bottom', column: 'right', scale: 1.05 },
  { id: 'r4c4', label: 'Bottom Far Right', character: 'clippy', row: 'bottom', column: 'farRight', scale: 1.15 }
]

const demoScaleMultiplier = 0.5
const enterDurationMs = 320
const exitDurationMs = 180

const rowAnimationPatterns: Record<DemoSprite['row'], RegExp[]> = {
  top: [/lookdown/i, /gesturedown/i, /wave/i, /greeting/i, /getattention/i],
  upper: [/lookdown/i, /gesture/i, /explain/i, /thinking/i, /processing/i],
  lower: [/lookup/i, /gesture/i, /thinking/i, /processing/i, /idle/i],
  bottom: [/lookup/i, /gestureup/i, /wave/i, /greeting/i, /getattention/i, /idle/i]
}

const columnAnimationPatterns: Record<DemoSprite['column'], RegExp[]> = {
  farLeft: [/right/i, /gestureright/i, /lookupright/i, /lookdownright/i, /hearing/i],
  left: [/right/i, /gestureright/i, /hearing/i, /thinking/i],
  right: [/left/i, /gestureleft/i, /hearing/i, /thinking/i],
  farRight: [/left/i, /gestureleft/i, /lookupleft/i, /lookdownleft/i, /hearing/i]
}

const avoidedAnimationPatterns = [/hide/i, /goodbye/i]

function shouldLoopInDemo(sprite: Pick<ActiveDemoSprite, 'character' | 'animation'>): boolean {
  const animationMetadata = builtInCharacterPacks[sprite.character].animationMetadata as Record<
    string,
    { duration: number; loops: boolean }
  >
  const metadata = animationMetadata[sprite.animation]
  if (!metadata) {
    return true
  }

  return metadata.loops && metadata.duration >= 1
}

function animationPoolForPosition(sprite: DemoSprite) {
  const animationNames = builtInCharacterPacks[sprite.character].animationNames
  const preferredPatterns = [
    ...rowAnimationPatterns[sprite.row],
    ...columnAnimationPatterns[sprite.column]
  ]
  const preferredAnimations = animationNames.filter((animationName) =>
    preferredPatterns.some((pattern) => pattern.test(animationName))
  )
  const safeAnimations = animationNames.filter(
    (animationName) => !avoidedAnimationPatterns.some((pattern) => pattern.test(animationName))
  )
  const preferredPool =
    preferredAnimations.length > 0
      ? preferredAnimations
      : safeAnimations.length > 0
        ? safeAnimations
        : animationNames
  const fallbackPool =
    safeAnimations.length > 0
      ? safeAnimations
      : animationNames

  return {
    all: animationNames,
    preferred: preferredPool,
    fallback: fallbackPool
  }
}

function positionAwareAnimation(sprite: DemoSprite, previousAnimation?: string): string {
  const pools = animationPoolForPosition(sprite)
  const fallbackPool =
    pools.fallback
  const candidatePool = previousAnimation
    ? pools.preferred.filter((animationName) => animationName !== previousAnimation)
    : pools.preferred
  const alternatePool = previousAnimation
    ? fallbackPool.filter((animationName) => animationName !== previousAnimation)
    : fallbackPool
  const finalPool =
    candidatePool.length > 0
      ? candidatePool
      : alternatePool.length > 0
        ? alternatePool
        : fallbackPool
  const index = Math.floor(Math.random() * finalPool.length)
  return finalPool[index] ?? pools.all[0]!
}

function shuffle<T>(values: readonly T[]): T[] {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1))
    const currentValue = copy[index]
    copy[index] = copy[nextIndex]!
    copy[nextIndex] = currentValue!
  }

  return copy
}

function comboKey(character: DemoSprite['character'], animation: string): string {
  return `${character}:${animation}`
}

function randomUnusedAssignment(
  sprite: DemoSprite,
  occupiedCombos: Set<string>,
  previousCombo?: Pick<ActiveDemoSprite, 'character' | 'animation'>
): Pick<ActiveDemoSprite, 'character' | 'animation'> {
  const prioritizedCharacters = previousCombo
    ? shuffle(assistantCharacters.filter((character) => character !== previousCombo.character))
    : shuffle(assistantCharacters)

  const candidateCombos = prioritizedCharacters.flatMap((character) => {
    const nextSprite = {
      ...sprite,
      character
    }
    const pools = animationPoolForPosition(nextSprite)
    const animations = shuffle([...pools.preferred, ...pools.fallback]).filter(
      (animation, index, values) =>
        values.indexOf(animation) === index &&
        (!previousCombo || comboKey(character, animation) !== comboKey(previousCombo.character, previousCombo.animation)) &&
        !occupiedCombos.has(comboKey(character, animation))
    )

    return animations.map((animation) => ({
      character,
      animation
    }))
  })

  if (candidateCombos.length > 0) {
    const index = Math.floor(Math.random() * candidateCombos.length)
    return candidateCombos[index]!
  }

  const fallbackCharacters = previousCombo
    ? assistantCharacters.filter((character) => character !== previousCombo.character)
    : assistantCharacters
  const fallbackCharacter = shuffle(fallbackCharacters)[0] ?? sprite.character
  const fallbackSprite = {
    ...sprite,
    character: fallbackCharacter
  }

  return {
    character: fallbackCharacter,
    animation: positionAwareAnimation(
      fallbackSprite,
      previousCombo?.character === fallbackCharacter ? previousCombo.animation : undefined
    )
  }
}

function buildInitialSprites(): ActiveDemoSprite[] {
  const occupiedCombos = new Set<string>()

  return sprites.map((sprite) => {
    const assignment = randomUnusedAssignment(sprite, occupiedCombos)
    occupiedCombos.add(comboKey(assignment.character, assignment.animation))

    return {
      ...sprite,
      character: assignment.character,
      animation: assignment.animation,
      phase: 'entering'
    }
  })
}

export function App() {
  const [activeSprites, setActiveSprites] = useState<ActiveDemoSprite[]>(() => buildInitialSprites())
  const activeSpritesRef = useRef(activeSprites)
  const timeoutIdsRef = useRef<number[]>([])

  useEffect(() => {
    activeSpritesRef.current = activeSprites
  }, [activeSprites])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveSprites((currentSprites) =>
        currentSprites.map((sprite) => ({
          ...sprite,
          phase: 'idle'
        }))
      )
    }, enterDurationMs)

    timeoutIdsRef.current.push(timeoutId)

    return () => {
      for (const currentTimeoutId of timeoutIdsRef.current) {
        window.clearTimeout(currentTimeoutId)
      }
      timeoutIdsRef.current = []
    }
  }, [])

  function rememberTimeout(callback: () => void, delay: number): void {
    const timeoutId = window.setTimeout(callback, delay)
    timeoutIdsRef.current.push(timeoutId)
  }

  function handleSpriteClick(spriteId: string): void {
    const currentSprite = activeSpritesRef.current.find((sprite) => sprite.id === spriteId)
    if (!currentSprite || currentSprite.phase !== 'idle') {
      return
    }

    setActiveSprites((currentSprites) =>
      currentSprites.map((sprite) =>
        sprite.id === spriteId
          ? {
              ...sprite,
              phase: 'exiting'
            }
          : sprite
      )
    )

    rememberTimeout(() => {
      setActiveSprites((currentSprites) =>
        currentSprites.map((sprite) =>
          sprite.id === spriteId
            ? (() => {
                const occupiedCombos = new Set(
                  currentSprites
                    .filter((activeSprite) => activeSprite.id !== sprite.id)
                    .map((activeSprite) => comboKey(activeSprite.character, activeSprite.animation))
                )
                const replacement = randomUnusedAssignment(sprite, occupiedCombos, sprite)

                return {
                  ...sprite,
                  character: replacement.character,
                  animation: replacement.animation,
                  phase: 'entering'
                }
              })()
            : sprite
        )
      )

      rememberTimeout(() => {
        setActiveSprites((currentSprites) =>
          currentSprites.map((sprite) =>
            sprite.id === spriteId
              ? {
                  ...sprite,
                  phase: 'idle'
                }
              : sprite
          )
        )
      }, enterDurationMs)
    }, exitDurationMs)
  }

  return (
    <main
      className="stage"
      style={{
        '--bliss-background': `url(${blissBackground})`,
        '--bliss-background-dark': `url(${blissBackgroundNight})`
      } as CSSProperties}
    >
      <div className="wash washA" />
      <div className="wash washB" />

      <div className="grid">
        {activeSprites.map((sprite, index) => (
          <button
            type="button"
            key={sprite.id}
            className={`cell row-${sprite.row} col-${sprite.column} phase-${sprite.phase}`}
            style={{ '--delay': '0ms' } as CSSProperties}
            aria-label={sprite.label}
            onClick={() => handleSpriteClick(sprite.id)}
          >
            <AssistantSprite
              character={sprite.character}
              animation={sprite.animation}
              loop={shouldLoopInDemo(sprite)}
              scale={sprite.scale * demoScaleMultiplier}
              className="assistant"
            />
          </button>
        ))}
      </div>
    </main>
  )
}
