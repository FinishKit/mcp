import { createServer } from 'http'
import { randomBytes } from 'crypto'
import { readCredentials, writeCredentials, getCredentialsPath } from './credentials.js'

const useColor = !process.env.NO_COLOR && process.stdout.isTTY
const c = {
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
}

const BASE_URL = process.env.FINISHKIT_BASE_URL || 'https://www.finishkit.app'
const TIMEOUT_MS = 2 * 60 * 1000

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process')
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start ""'
        : 'xdg-open'

  return new Promise((resolve) => {
    exec(`${cmd} "${url}"`, (err) => {
      if (err) {
        console.log('')
        console.log(c.yellow('  Could not open browser automatically.'))
        console.log(`  Open this URL manually: ${c.cyan(url)}`)
      }
      resolve()
    })
  })
}

function findPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        srv.close(() => reject(new Error('Could not find available port')))
      }
    })
    srv.on('error', reject)
  })
}

async function main(): Promise<void> {
  console.log('')
  console.log(c.bold('  FinishKit Login'))
  console.log(c.dim('  Connect your editor to FinishKit'))
  console.log('')

  // Check for existing credentials
  const existing = readCredentials()
  if (existing) {
    console.log(c.yellow('  You are already logged in.'))
    console.log(c.dim(`  Credentials: ${getCredentialsPath()}`))
    console.log('')
    console.log('  To log in with a different account, run:')
    console.log(`    ${c.cyan('npx @finishkit/mcp logout')}`)
    console.log('  Then run login again.')
    console.log('')
    return
  }

  const nonce = randomBytes(16).toString('hex')
  let port: number

  try {
    port = await findPort()
  } catch {
    console.log(c.yellow('  Could not find an available port.'))
    console.log(`  Visit ${c.cyan(`${BASE_URL}/activate`)} to set up manually.`)
    console.log('')
    return
  }

  const callbackUrl = `http://127.0.0.1:${port}/callback`

  return new Promise<void>((resolve) => {
    let settled = false

    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)

      if (url.pathname === '/callback') {
        const key = url.searchParams.get('key')
        const returnedNonce = url.searchParams.get('nonce')

        // Serve a nice HTML response regardless of outcome
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

        if (!key || returnedNonce !== nonce) {
          res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>Authentication failed</h2><p>Please try again from your terminal.</p></body></html>')
          return
        }

        res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>Connected!</h2><p>You can close this tab and return to your terminal.</p></body></html>')

        writeCredentials(key, 'cli-login')

        console.log('')
        console.log(`  ${c.green('\u2713')} Signed in successfully`)
        console.log(`  ${c.green('\u2713')} API key saved to ${c.dim(getCredentialsPath())}`)
        console.log(`  ${c.green('\u2713')} Ready to use! Your AI editor will pick this up automatically.`)
        console.log('')

        settled = true
        server.close(() => resolve())
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    server.listen(port, '127.0.0.1', async () => {
      const authUrl = `${BASE_URL}/cli/auth?port=${port}&nonce=${nonce}&callback=${encodeURIComponent(callbackUrl)}`

      console.log('  Opening your browser to sign in to FinishKit...')
      console.log('')

      await openBrowser(authUrl)

      console.log(c.dim('  Waiting for authentication... (press Ctrl+C to cancel)'))
      console.log('')
      console.log(c.dim(`  If the browser didn't open, visit:`))
      console.log(`  ${c.cyan(authUrl)}`)
      console.log('')
    })

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      if (!settled) {
        console.log('')
        console.log(c.yellow('  Login timed out after 2 minutes.'))
        console.log(`  You can try again with: ${c.cyan('npx @finishkit/mcp login')}`)
        console.log(`  Or visit: ${c.cyan(`${BASE_URL}/activate`)}`)
        console.log('')
        server.close(() => resolve())
      }
    }, TIMEOUT_MS)

    server.on('close', () => clearTimeout(timeout))

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      if (!settled) {
        console.log('')
        console.log(c.dim('  Login cancelled.'))
        console.log('')
        server.close(() => process.exit(0))
      }
    })
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`  Error: ${message}`)
  process.exit(1)
})
