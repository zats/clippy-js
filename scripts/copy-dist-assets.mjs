import { mkdir, cp } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const sourceAssets = path.resolve(packageRoot, 'src/assets')
const distAssets = path.resolve(packageRoot, 'dist/assets')

await mkdir(path.dirname(distAssets), { recursive: true })
await cp(sourceAssets, distAssets, { recursive: true, force: true })
