import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { writeCredentials } from './credentials.js'

// --- ANSI colors (disabled when NO_COLOR set or not a TTY) ---

const useColor = !process.env.NO_COLOR && process.stdout.isTTY

const c = {
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
}

// --- Types ---

interface ParsedArgs {
  editors: string[]
  apiKey?: string
}

interface ConfigResult {
  editor: string
  success: boolean
  message: string
}

// --- Argument parsing ---

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(3) // skip node, script, 'setup'
  const editors: string[] = []
  let apiKey: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--claude-code') editors.push('claude-code')
    else if (arg === '--cursor') editors.push('cursor')
    else if (arg === '--windsurf') editors.push('windsurf')
    else if (arg === '--codex') editors.push('codex')
    else if (arg === '--vscode') editors.push('vscode')
    else if (arg === '--api-key' && i + 1 < args.length) {
      apiKey = args[++i]
    }
  }

  return { editors, apiKey }
}

// --- Utility: check if command exists on PATH ---

function isOnPath(cmd: string): boolean {
  try {
    const check = process.platform === 'win32' ? 'where' : 'which'
    execSync(`${check} ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// --- Utility: merge MCP server entry into a JSON config file ---

function mergeJsonConfig(
  filePath: string,
  apiKey?: string,
): void {
  const entry = {
    command: 'npx',
    args: ['-y', '@finishkit/mcp'],
    ...(apiKey ? { env: { FINISHKIT_API_KEY: apiKey } } : {}),
  }

  let existing: Record<string, unknown> = {}

  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf-8').trim()
      if (raw) {
        existing = JSON.parse(raw)
      }
    } catch {
      // File exists but is malformed; we'll overwrite the structure
    }
  } else {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  if (!existing.mcpServers || typeof existing.mcpServers !== 'object') {
    existing.mcpServers = {}
  }

  ;(existing.mcpServers as Record<string, unknown>).finishkit = entry

  writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
}

// --- Editor detection ---

interface EditorInfo {
  id: string
  name: string
  detected: boolean
}

function detectEditors(): EditorInfo[] {
  const home = homedir()
  return [
    {
      id: 'claude-code',
      name: 'Claude Code',
      detected: isOnPath('claude'),
    },
    {
      id: 'cursor',
      name: 'Cursor',
      detected: existsSync(join(home, '.cursor')),
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      detected: existsSync(join(home, '.codeium', 'windsurf')),
    },
    {
      id: 'vscode',
      name: 'VS Code',
      detected: isOnPath('code'),
    },
    {
      id: 'codex',
      name: 'Codex',
      detected: isOnPath('codex'),
    },
  ]
}

// --- Per-editor configuration ---

function configureClaudeCode(apiKey?: string): ConfigResult {
  try {
    const envFlag = apiKey ? ` -e FINISHKIT_API_KEY=${apiKey}` : ''
    execSync(
      `claude mcp add finishkit${envFlag} -- npx -y @finishkit/mcp`,
      { stdio: 'ignore' },
    )
    return {
      editor: 'Claude Code',
      success: true,
      message: 'Registered via `claude mcp add`',
    }
  } catch {
    return {
      editor: 'Claude Code',
      success: false,
      message: 'Failed to run `claude mcp add`. You can run it manually:\n' +
        `    claude mcp add finishkit -- npx -y @finishkit/mcp`,
    }
  }
}

function configureCursor(apiKey?: string): ConfigResult {
  const configPath = join(homedir(), '.cursor', 'mcp.json')
  try {
    mergeJsonConfig(configPath, apiKey)
    return {
      editor: 'Cursor',
      success: true,
      message: `Updated ${configPath}`,
    }
  } catch (err) {
    return {
      editor: 'Cursor',
      success: false,
      message: `Failed to update ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

function configureWindsurf(apiKey?: string): ConfigResult {
  const configPath = join(homedir(), '.codeium', 'windsurf', 'mcp_config.json')
  try {
    mergeJsonConfig(configPath, apiKey)
    return {
      editor: 'Windsurf',
      success: true,
      message: `Updated ${configPath}`,
    }
  } catch (err) {
    return {
      editor: 'Windsurf',
      success: false,
      message: `Failed to update ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

function configureVSCode(apiKey?: string): ConfigResult {
  const vscodeDir = join(process.cwd(), '.vscode')
  if (!existsSync(vscodeDir)) {
    return {
      editor: 'VS Code',
      success: false,
      message: 'No .vscode/ directory in current project. VS Code MCP config is per-workspace.\n' +
        '    Create .vscode/mcp.json manually, or run this command from your project root.',
    }
  }
  const configPath = join(vscodeDir, 'mcp.json')
  try {
    mergeJsonConfig(configPath, apiKey)
    return {
      editor: 'VS Code',
      success: true,
      message: `Updated ${configPath}`,
    }
  } catch (err) {
    return {
      editor: 'VS Code',
      success: false,
      message: `Failed to update ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

function configureCodex(apiKey?: string): ConfigResult {
  try {
    const envFlag = apiKey ? ` -e FINISHKIT_API_KEY=${apiKey}` : ''
    execSync(
      `codex mcp add finishkit${envFlag} -- npx -y @finishkit/mcp`,
      { stdio: 'ignore' },
    )
    return {
      editor: 'Codex',
      success: true,
      message: 'Registered via `codex mcp add`',
    }
  } catch {
    return {
      editor: 'Codex',
      success: false,
      message: 'Could not auto-configure Codex. Add FinishKit manually to your Codex MCP config.',
    }
  }
}

// --- Configure dispatcher ---

function configure(editorId: string, apiKey?: string): ConfigResult {
  switch (editorId) {
    case 'claude-code': return configureClaudeCode(apiKey)
    case 'cursor': return configureCursor(apiKey)
    case 'windsurf': return configureWindsurf(apiKey)
    case 'vscode': return configureVSCode(apiKey)
    case 'codex': return configureCodex(apiKey)
    default:
      return { editor: editorId, success: false, message: `Unknown editor: ${editorId}` }
  }
}

// --- Main ---

function main(): void {
  console.log('')
  console.log(c.bold('  FinishKit MCP Setup'))
  console.log(c.dim('  Production readiness scanner for AI-built apps'))
  console.log('')

  const { editors: requestedEditors, apiKey } = parseArgs(process.argv)

  // Determine which editors to configure
  let targets: { id: string; name: string }[]

  if (requestedEditors.length > 0) {
    // User specified editors explicitly
    targets = requestedEditors.map((id) => ({
      id,
      name: id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
    }))
  } else {
    // Auto-detect
    console.log(c.dim('  Detecting editors...'))
    console.log('')
    const detected = detectEditors()
    const found = detected.filter((e) => e.detected)

    if (found.length === 0) {
      console.log(c.yellow('  No supported editors detected.'))
      console.log('')
      console.log('  You can target a specific editor:')
      console.log('')
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --claude-code')}`)
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --cursor')}`)
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --windsurf')}`)
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --codex')}`)
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --vscode')}`)
      console.log('')
      return
    }

    targets = found.map((e) => ({ id: e.id, name: e.name }))
    console.log(`  Found: ${targets.map((t) => c.bold(t.name)).join(', ')}`)
    console.log('')
  }

  // Configure each editor
  const results: ConfigResult[] = []
  for (const target of targets) {
    const result = configure(target.id, apiKey)
    results.push(result)
  }

  // Print results
  for (const result of results) {
    const icon = result.success ? c.green('\u2713') : c.yellow('!')
    console.log(`  ${icon} ${c.bold(result.editor)}`)
    for (const line of result.message.split('\n')) {
      console.log(`    ${c.dim(line)}`)
    }
  }

  const anySuccess = results.some((r) => r.success)

  if (anySuccess) {
    console.log('')

    // API key guidance
    if (!apiKey) {
      console.log(c.bold('  Next: Connect your account'))
      console.log('')
      console.log('  Option A: Run this command (opens browser, auto-configures):')
      console.log('')
      console.log(`    ${c.cyan('npx @finishkit/mcp login')}`)
      console.log('')
      console.log('  Option B: Visit ' + c.cyan('https://finishkit.app/activate'))
      console.log('  Then re-run with your key:')
      console.log('')
      console.log(`    ${c.cyan('npx @finishkit/mcp setup --api-key fk_live_your_key_here')}`)
      console.log('')
      console.log(c.dim('  Free plan includes 5 scans/month. No credit card needed.'))
    } else {
      writeCredentials(apiKey, 'setup')
      console.log(c.green('  API key configured.'))
    }

    console.log('')
    console.log(c.bold('  Restart your editor to activate FinishKit.'))
    console.log('')
    console.log(c.dim('  Then ask your AI: "Run a FinishKit scan on this project"'))
    console.log('')
  }
}

main()
