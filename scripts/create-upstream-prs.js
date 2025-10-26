const path = require('path')
const { spawnSync } = require('child_process')
const { projects } = require('./repos.json')

const repoRoot = path.join(__dirname, '..')

const dryRun = process.env.DRY_RUN === 'true'
const patPassword = process.env.PAT_PASSWORD || process.env.UPSTREAM_PUSH_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
const patUsername = process.env.PAT_USERNAME || 'x-access-token'
const defaultEnv = {
  ...process.env,
  ...(patPassword ? { GH_TOKEN: process.env.GH_TOKEN || patPassword, GITHUB_TOKEN: process.env.GITHUB_TOKEN || patPassword } : {})
}

function resolveEnv(envOverrides = {}) {
  return { ...defaultEnv, ...envOverrides }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
    env: resolveEnv(options.env)
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
  return result
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
    env: resolveEnv(options.env)
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

function captureOrNull(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
    env: resolveEnv(options.env)
  })
  if (result.status !== 0) return null
  return result.stdout.trim()
}

function configureGitCredentials() {
  if (!patPassword || dryRun) return
  run('git', ['config', '--global', 'credential.helper', 'store'])
  const result = spawnSync('git', ['credential', 'approve'], {
    cwd: repoRoot,
    env: resolveEnv(),
    input: `protocol=https\nhost=github.com\nusername=${patUsername}\npassword=${patPassword}\n\n`,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit']
  })
  if (result.status !== 0) {
    throw new Error('Failed to configure git credentials')
  }
}

const prNumber = process.env.PR_NUMBER
let [, , baseRefArg, headRefArg] = process.argv
let prHeadRef = process.env.PR_HEAD_REF || headRefArg
let sourceTitle = process.env.PR_SOURCE_TITLE || ''
let sourceBody = process.env.PR_SOURCE_BODY || ''

if ((!baseRefArg || !headRefArg || !prHeadRef || !sourceTitle || !sourceBody) && prNumber) {
  const prDataRaw = capture('gh', [
    'pr',
    'view',
    prNumber,
    '--json',
    'headRefName,baseRefName,title,body'
  ])
  const prData = JSON.parse(prDataRaw)
  if (!baseRefArg && prData.baseRefName) {
    run('git', ['fetch', 'origin', prData.baseRefName])
    baseRefArg = `origin/${prData.baseRefName}`
  }
  if (!headRefArg) headRefArg = 'HEAD'
  if (!prHeadRef) prHeadRef = prData.headRefName
  if (!sourceTitle) sourceTitle = prData.title || ''
  if (!sourceBody) sourceBody = prData.body || ''
}

if (!baseRefArg || !headRefArg) {
  console.error('Usage: node scripts/create-upstream-prs.js <base-ref> <head-ref>')
  console.error('  or provide PR_NUMBER env to infer refs automatically.')
  process.exit(1)
}

if (!patPassword && !dryRun) {
  console.warn('PAT_PASSWORD (or GH_TOKEN/GITHUB_TOKEN) not provided. Ensure git and gh are already authenticated.')
}

const baseRef = baseRefArg
const headRef = headRefArg

function ensureRefAvailable(ref) {
  if (!ref) return
  const resolved = captureOrNull('git', ['rev-parse', '--verify', ref])
  if (resolved) return
  const remoteMatch = ref.match(/^([^/]+)\/(.+)$/)
  if (remoteMatch) {
    const [, remote, branch] = remoteMatch
    const hasRemote = captureOrNull('git', ['remote', 'get-url', remote])
    if (!hasRemote) {
      throw new Error(`Remote ${remote} not found while resolving ${ref}`)
    }
    console.log(`Fetching ${remote} ${branch}`)
    run('git', ['fetch', remote, branch])
  }
  const postFetch = captureOrNull('git', ['rev-parse', '--verify', ref])
  if (!postFetch) {
    throw new Error(`Unable to resolve ref ${ref}`)
  }
}

ensureRefAvailable(baseRef)
ensureRefAvailable(headRef)

const branchPrefix = process.env.UPSTREAM_BRANCH_PREFIX || 'monotree/'
const defaultTitle = sourceTitle || '[monotree] Sync {tree} from {branch}'
const defaultBody = sourceBody || 'This pull request was automatically generated from `{branch}` in the monotree.'
const prTitleTemplate = process.env.UPSTREAM_PR_TITLE_TEMPLATE || process.env.PR_TITLE || defaultTitle
const prBodyTemplate = process.env.UPSTREAM_PR_BODY_TEMPLATE || process.env.PR_BODY || defaultBody

const sanitize = value => value
  .trim()
  .replace(/[^A-Za-z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'update'

const escapedBranch = sanitize(prHeadRef || headRefArg)

const diffOutput = capture('git', ['diff', '--name-only', `${baseRef}..${headRef}`])
const changedFiles = diffOutput.split('\n').map(line => line.trim()).filter(Boolean)

const treeNames = Array.from(new Set(changedFiles
  .map(file => file.split('/')
    .slice(0, 2)
    .join('/')
  )
  .filter(prefix => prefix.startsWith('trees/'))
  .map(prefix => prefix.split('/')[1])
))

if (treeNames.length === 0) {
  console.log('No trees changed between', baseRef, 'and', headRef)
  process.exit(0)
}

function getDefaultBranch(url) {
  const output = captureOrNull('git', ['ls-remote', '--symref', url, 'HEAD'])
  if (!output) return 'main'
  const lines = output.split('\n')
  for (const line of lines) {
    const match = line.match(/^ref: refs\/heads\/([\w./-]+)\s+HEAD$/)
    if (match) return match[1]
  }
  return 'main'
}

function formatTemplate(template, tree) {
  return template
    .replace(/\{tree\}/g, tree)
    .replace(/\{branch\}/g, escapedBranch)
    .replace(/\{source_title\}/g, sourceTitle)
    .replace(/\{source_body\}/g, sourceBody)
}

console.log('Detected trees:', treeNames.join(', '))

if (patPassword && !dryRun) {
  configureGitCredentials()
}

for (const tree of treeNames) {
  const remoteUrl = projects[tree]
  if (!remoteUrl) {
    console.warn(`No remote configured for tree ${tree}, skipping`)
    continue
  }

  const remoteName = `up-${tree.replace(/[^A-Za-z0-9-]/g, '-')}`

  const remoteExists = captureOrNull('git', ['remote', 'get-url', remoteName])
  if (!remoteExists) {
    console.log(`Adding remote ${remoteName} -> ${remoteUrl}`)
    run('git', ['remote', 'add', remoteName, remoteUrl])
  }

  console.log(`Splitting subtree for ${tree}`)
  const splitRef = capture('git', ['subtree', 'split', `--prefix=trees/${tree}`, headRef])
  const remoteBranch = `${branchPrefix}${escapedBranch}`

  if (dryRun) {
    console.log(`[dry-run] Would push ${splitRef} to ${remoteName}/${remoteBranch}`)
  } else {
    run('git', ['push', '--force-with-lease', remoteName, `${splitRef}:refs/heads/${remoteBranch}`])
  }

  if (dryRun) {
    console.log(`[dry-run] Would create PR for ${tree}`)
    continue
  }

  const repoSlug = remoteUrl
    .replace('https://github.com/', '')
    .replace(/\.git$/, '')

  const baseBranch = getDefaultBranch(remoteUrl)

  console.log(`Creating or updating PR for ${tree} (${repoSlug}) targeting ${baseBranch}`)

  const existing = captureOrNull('gh', [
    'pr',
    'list',
    '--repo', repoSlug,
    '--state', 'open',
    '--head', remoteBranch,
    '--json', 'number'
  ])
  const hasExisting = existing && existing !== '[]'

  if (hasExisting) {
    console.log(`Open PR already exists for ${tree} on branch ${remoteBranch}, skipping creation`)
    continue
  }

  const prTitle = formatTemplate(prTitleTemplate, tree)
  const prBody = formatTemplate(prBodyTemplate, tree)

  run('gh', [
    'pr',
    'create',
    '--repo', repoSlug,
    '--base', baseBranch,
    '--head', remoteBranch,
    '--title', prTitle,
    '--body', prBody
  ])
}
