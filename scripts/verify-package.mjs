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
  './auth',
  './billing',
  './canvas',
  './generation',
  './models',
  './rag',
  './workflow'
]

const requiredFiles = [
  'package/package.json',
  'package/dist/admin/index.js',
  'package/dist/admin/index.d.ts',
  'package/dist/billing/index.js',
  'package/dist/billing/index.d.ts',
  'package/dist/models/index.js',
  'package/dist/models/index.d.ts',
  'package/dist/workflow/index.js',
  'package/dist/workflow/index.d.ts',
  'package/dist/workflow/run.js',
  'package/dist/workflow/run.d.ts'
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
