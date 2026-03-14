import { AssistantSprite, builtInCharacterPacks, type CharacterName } from 'clippy-js'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from 'react'
import blissBackground from '../../clippy-swift/Sources/ClippySwiftDemo/Resources/bliss.png'
import blissBackgroundNight from '../../clippy-swift/Sources/ClippySwiftDemo/Resources/bliss_at_night.png'

const hiddenAnimationPattern = /^(Hide|Show|RestPose|GoodBye|Goodbye)$/i

const characterOrder = Object.keys(builtInCharacterPacks) as CharacterName[]

function visibleAnimationsFor(character: CharacterName): string[] {
  const animations = builtInCharacterPacks[character].animationNames
  const visibleAnimations = animations.filter((animation) => !hiddenAnimationPattern.test(animation))

  return visibleAnimations.length > 0 ? visibleAnimations : animations
}

function defaultAnimationFor(character: CharacterName): string {
  return visibleAnimationsFor(character)[0] ?? builtInCharacterPacks[character].animationNames[0]!
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterName>('clippy')
  const [selectedAnimation, setSelectedAnimation] = useState<string>(() => defaultAnimationFor('clippy'))
  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const [isWindowMinimized, setIsWindowMinimized] = useState(false)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [windowOffset, setWindowOffset] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef<DragState | null>(null)
  const sourceCodeRef = useRef<HTMLTextAreaElement | null>(null)

  const animationOptions = useMemo(
    () => visibleAnimationsFor(selectedCharacter),
    [selectedCharacter]
  )

  useEffect(() => {
    if (!animationOptions.includes(selectedAnimation)) {
      setSelectedAnimation(defaultAnimationFor(selectedCharacter))
    }
  }, [animationOptions, selectedAnimation, selectedCharacter])

  const selectedPack = builtInCharacterPacks[selectedCharacter]
  const codeSnippet = `import { AssistantSprite } from 'clippy-js'

export function Demo() {
  return (
    <AssistantSprite
      character="${selectedCharacter}"
      animation="${selectedAnimation}"
      loop
    />
  )
}`

  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const sourceCodeElement = sourceCodeRef.current
      if (!sourceCodeElement) {
        return
      }

      if (event.target instanceof Node && sourceCodeElement.contains(event.target)) {
        return
      }

      if (document.activeElement === sourceCodeElement) {
        sourceCodeElement.blur()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  function handleTitleBarPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    event.preventDefault()

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: windowOffset.x,
      originY: windowOffset.y
    }

    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current
      if (!dragState || moveEvent.pointerId !== dragState.pointerId) {
        return
      }

      setWindowOffset({
        x: dragState.originX + (moveEvent.clientX - dragState.startX),
        y: dragState.originY + (moveEvent.clientY - dragState.startY)
      })
    }

    const endDrag = (pointerId: number) => {
      if (dragStateRef.current?.pointerId !== pointerId) {
        return
      }

      dragStateRef.current = null
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      endDrag(upEvent.pointerId)
    }

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      endDrag(cancelEvent.pointerId)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
  }

  function handleSourceCodeFocus(): void {
    sourceCodeRef.current?.select()
  }

  function handleTitleBarButtonClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleTitleBarButtonPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
    event.preventDefault()
    event.stopPropagation()
  }

  function handleCloseClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    handleTitleBarButtonClick(event)
    setIsCloseDialogOpen(true)
  }

  function handleMinimizeClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    handleTitleBarButtonClick(event)
    setIsWindowMinimized(true)
  }

  function handleRestoreClick(): void {
    setIsWindowMinimized(false)
  }

  function handleCloseDialogConfirm(): void {
    setIsCloseDialogOpen(false)
    setIsWindowVisible(false)
  }

  function handleCloseDialogCancel(): void {
    setIsCloseDialogOpen(false)
  }

  if (!isWindowVisible) {
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
      </main>
    )
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

      <div className="shell">
        {!isWindowMinimized ? (
          <section
            className="window panel xpWindow"
            style={{ transform: `translate(${windowOffset.x}px, ${windowOffset.y}px)` }}
          >
            <div className="title-bar draggableTitleBar" onPointerDown={handleTitleBarPointerDown}>
              <div className="title-bar-text">clippy-js Sample App</div>
              <div className="title-bar-controls" aria-hidden="true">
                <button
                  type="button"
                  tabIndex={-1}
                  className="windowControl windowControlMinimize"
                  onPointerDown={handleTitleBarButtonPointerDown}
                  onClick={handleMinimizeClick}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled
                  className="windowControl windowControlMaximize"
                  onPointerDown={handleTitleBarButtonPointerDown}
                  onClick={handleTitleBarButtonClick}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="windowControl windowControlClose"
                  onPointerDown={handleTitleBarButtonPointerDown}
                  onClick={handleCloseClick}
                />
              </div>
            </div>
            <div className="window-body panelBody">
              <div className="previewColumn">
                <fieldset className="pickerSection previewSection">
                  <legend>Preview</legend>

                  <div className="previewFrame">
                  <AssistantSprite
                    character={selectedCharacter}
                    animation={selectedAnimation}
                    loop
                    className="assistantPreview"
                  />
                  </div>
                </fieldset>

                <fieldset className="pickerSection sourceSection">
                  <legend>React</legend>
                  <textarea
                    ref={sourceCodeRef}
                    className="sourceCode"
                    readOnly
                    value={codeSnippet}
                    onFocus={handleSourceCodeFocus}
                    onClick={handleSourceCodeFocus}
                  />
                </fieldset>
              </div>

              <div className="controlsColumn">
                <fieldset className="pickerSection" aria-labelledby="agents-heading">
                  <legend id="agents-heading">Agents</legend>

                  <div className="choiceList">
                    {characterOrder.map((character) => {
                      const pack = builtInCharacterPacks[character]
                      const isSelected = character === selectedCharacter

                      return (
                        <button
                          key={character}
                          type="button"
                          className={`choiceButton ${isSelected ? 'active is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedCharacter(character)
                            setSelectedAnimation(defaultAnimationFor(character))
                          }}
                        >
                          <span>{pack.displayName}</span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <fieldset className="pickerSection" aria-labelledby="animations-heading">
                  <legend id="animations-heading">Animations</legend>
                  <div className="choiceList animationList">
                    {animationOptions.map((animation) => {
                      const isSelected = animation === selectedAnimation

                      return (
                        <button
                          key={animation}
                          type="button"
                          className={`choiceButton ${isSelected ? 'active is-selected' : ''}`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedAnimation(animation)
                          }}
                        >
                          <span>{animation}</span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
            <div className="status-bar">
              <p className="status-bar-field">Agent: {selectedPack.displayName}</p>
              <p className="status-bar-field">Animation: {selectedAnimation}</p>
              <p className="status-bar-field">Scale: 0.5x</p>
            </div>
          </section>
        ) : null}
      </div>
      <div className="restoreDock">
        {isWindowMinimized ? (
          <button type="button" className="restoreButton" onClick={handleRestoreClick}>
            clippy-js Sample App
          </button>
        ) : null}
      </div>
      {isCloseDialogOpen ? (
        <div className="dialogOverlay">
          <section className="window xpDialog" role="alertdialog" aria-modal="true" aria-labelledby="close-dialog-title">
            <div className="title-bar">
              <div className="title-bar-text" id="close-dialog-title">
                Exit clippy-js Sample App
              </div>
            </div>
            <div className="window-body xpDialogBody">
              <p>Do you want to close this sample app window?</p>
              <div className="xpDialogActions">
                <button type="button" autoFocus onClick={handleCloseDialogConfirm}>
                  Yes
                </button>
                <button type="button" onClick={handleCloseDialogCancel}>
                  No
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
