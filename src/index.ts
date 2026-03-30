import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FinishKit } from '@finishkit/sdk'
import { createFinishKitServer } from './server.js'
import { readCredentials } from './credentials.js'

async function main(): Promise<void> {
  const envKey = process.env.FINISHKIT_API_KEY
  const credFile = readCredentials()
  const apiKey = envKey || credFile?.apiKey || undefined
  const baseUrl = process.env.FINISHKIT_BASE_URL || 'https://finishkit.app'

  let fk: FinishKit | null = null

  process.stderr.write(`FinishKit MCP v0.3.3 starting...\n`)

  if (apiKey && apiKey.trim()) {
    fk = new FinishKit({ apiKey, baseUrl })
    const source = envKey ? 'environment variable' : 'credentials file'
    process.stderr.write(`FinishKit MCP v0.3.3: API key found (${source}).\n`)
  } else {
    process.stderr.write(
      `FinishKit MCP v0.3.3: No API key. Env FINISHKIT_API_KEY=${envKey ? 'set' : 'not set'}. Credentials file=${credFile ? 'loaded' : 'not found'}.\n`,
    )
  }

  const server = createFinishKitServer(fk, baseUrl)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  process.stderr.write(
    `FinishKit MCP v0.3.3 ready. API key: ${fk ? 'configured' : 'not set'}.\n`,
  )
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`FinishKit MCP fatal error: ${message}\n`)
  process.exit(1)
})
