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

const requiredFiles = [
  'package/package.json',
  'package/dist/agent/index.js',
  'package/dist/agent/index.d.ts',
  'package/dist/agent/canvas-run.js',
  'package/dist/agent/canvas-run.d.ts',
  'package/dist/admin/index.js',
  'package/dist/admin/index.d.ts',
  'package/dist/billing/index.js',
  'package/dist/billing/index.d.ts',
  'package/dist/canvas/index.js',
  'package/dist/canvas/index.d.ts',
  'package/dist/canvas/graph.js',
  'package/dist/canvas/graph.d.ts',
  'package/dist/models/index.js',
  'package/dist/models/index.d.ts',
  'package/dist/storage/index.js',
  'package/dist/storage/index.d.ts'
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

const listing = new Set(
  run('tar', ['-tf', tarballPath])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
)

const missingFiles = requiredFiles.filter((file) => !listing.has(file))

if (missingFiles.length > 0) {
  console.error('Package tarball is missing required files:')
  for (const file of missingFiles) {
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

console.log(
  `Verified ${packageJson.name}@${packageJson.version}: ${requiredExports.length} exports, ${requiredFiles.length} required files`
)
