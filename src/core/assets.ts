import { builtInCharacterPacks } from '../generated/packs'
import type { AssistantManifest, CharacterName, LoadedCharacterPack } from './types'

const loadedPackPromises = new Map<CharacterName, Promise<LoadedCharacterPack>>()

async function loadManifest(url: string): Promise<AssistantManifest> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load manifest from ${url}.`)
  }
  return (await response.json()) as AssistantManifest
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load atlas from ${url}.`))
    image.src = url
  })
}

export function getBuiltInPackDefinition(character: CharacterName) {
  return builtInCharacterPacks[character]
}

export function loadBuiltInCharacterPack(character: CharacterName): Promise<LoadedCharacterPack> {
  const existing = loadedPackPromises.get(character)
  if (existing) {
    return existing
  }

  const definition = getBuiltInPackDefinition(character)
  const promise = Promise.all([
    loadManifest(definition.manifestUrl),
    loadImage(definition.atlasUrl)
  ]).then(([manifest, atlasImage]) => ({
    character,
    displayName: definition.displayName,
    atlasUrl: definition.atlasUrl,
    manifestUrl: definition.manifestUrl,
    manifest,
    atlasImage
  }))

  loadedPackPromises.set(character, promise)
  return promise
}
