import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { FinishKit } from '@finishkit/sdk'
import { createFinishKitServer } from './server.js'

async function main(): Promise<void> {
  const apiKey = process.env.FINISHKIT_API_KEY

  if (!apiKey || !apiKey.trim()) {
    process.stderr.write(
      [
        'FinishKit MCP Error: FINISHKIT_API_KEY environment variable is not set.',
        '',
        'To get an API key:',
        '  1. Go to https://finishkit.app/dashboard/settings?tab=developer',
        '  2. Generate a new API key (format: fk_live_...)',
        '  3. Set it as FINISHKIT_API_KEY in your MCP client config',
        '',
        'Example Claude Desktop config (~/.claude/claude_desktop_config.json):',
        '{',
        '  "mcpServers": {',
        '    "finishkit": {',
        '      "command": "npx",',
        '      "args": ["-y", "@finishkit/mcp"],',
        '      "env": {',
        '        "FINISHKIT_API_KEY": "fk_live_your_key_here"',
        '      }',
        '    }',
        '  }',
        '}',
        '',
      ].join('\n'),
    )
    process.exit(1)
  }

  const fk = new FinishKit({ apiKey })
  const server = createFinishKitServer(fk)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Log startup to stderr (not stdout, which is used for MCP protocol)
  process.stderr.write('FinishKit MCP server started.\n')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`FinishKit MCP fatal error: ${message}\n`)
  process.exit(1)
})
