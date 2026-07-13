import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const tarballPath = process.argv[2]

if (!tarballPath) {
  console.error('Usage: node scripts/verify-package.mjs <tarball.tgz>')
  process.exit(1)
}

const requiredExports = [
  '.',
  './admin',
  './agent',
  './api',
  './artifacts',
  './auth',
  './billing',
  './canvas',
  './events',
  './generation',
  './models',
  './rag',
  './storage',
  './team',
  './utils'
]

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`
    )
  }

  return result.stdout
}

function packageFilePath(value) {
  if (typeof value !== 'string') return []
  const path = value.replace(/^\.\//, '')
  return path ? [`package/${path}`] : []
}

function exportTargetFiles(entry) {
  if (typeof entry === 'string') return packageFilePath(entry)
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
  return Object.values(entry).flatMap((value) => exportTargetFiles(value))
}

function unique(values) {
  return Array.from(new Set(values))
}

const listing = new Set(
  run('tar', ['-tf', tarballPath])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
)

const requiredBaseFiles = ['package/package.json']
const missingBaseFiles = requiredBaseFiles.filter((file) => !listing.has(file))

if (missingBaseFiles.length > 0) {
  console.error('Package tarball is missing required files:')
  for (const file of missingBaseFiles) {
    console.error(`  - ${file}`)
  }
  process.exit(1)
}

const unpackDir = await mkdtemp(join(tmpdir(), 'canvas-contracts-pack-'))
run('tar', ['-xzf', tarballPath, '-C', unpackDir, 'package/package.json'])

const packageJson = JSON.parse(
  await readFile(join(unpackDir, 'package/package.json'), 'utf8')
)

const exportsMap = packageJson.exports ?? {}
const missingExports = requiredExports.filter((entry) => !(entry in exportsMap))

if (missingExports.length > 0) {
  console.error('Package tarball is missing required exports:')
  for (const entry of missingExports) {
    console.error(`  - ${entry}`)
  }
  process.exit(1)
}

const requiredFiles = unique([
  'package/package.json',
  'package/README.md',
  ...requiredExports.flatMap((entry) => exportTargetFiles(exportsMap[entry]))
])
const missingFiles = requiredFiles.filter((file) => !listing.has(file))

if (missingFiles.length > 0) {
  console.error('Package tarball is missing required files:')
  for (const file of missingFiles) {
    console.error(`  - ${file}`)
  }
  process.exit(1)
}

console.log(
  `Verified ${packageJson.name}@${packageJson.version}: ${requiredExports.length} exports, ${requiredFiles.length} required files`
)
