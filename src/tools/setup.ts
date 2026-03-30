import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'
import {
  readCredentials,
  readPendingSession,
  writePendingSession,
  writeCredentials,
  deletePendingSession,
} from '../credentials.js'

export const finishkitSetupToolDefinition = {
  name: 'finishkit_setup',
  description:
    'Set up FinishKit or check connection status. Creates a setup link if not connected. Use when any tool reports FinishKit is not connected, or when users ask "what is FinishKit?"',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
}

export async function finishkitSetup(
  fk: FinishKit | null,
  baseUrl: string,
): Promise<CallToolResult> {
  // Case 1: Already connected and working
  if (fk) {
    try {
      await fk.projects.list()
      return {
        content: [
          {
            type: 'text',
            text: [
              'FinishKit is connected and ready.',
              '',
              'Available tools:',
              '  scan_repo - Scan a GitHub repo for production readiness',
              '  get_scan_status - Check scan progress',
              '  get_findings - Get prioritized findings from a scan',
              '  get_patches - Get auto-generated code patches',
              '  list_projects - List connected projects',
              '  create_project - Connect a new GitHub repo',
              '  request_intelligence_pack - Get stack-specific analysis',
              '  sync_findings - Sync local findings to dashboard',
              '',
              'Try: "Scan this project for production readiness"',
            ].join('\n'),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [
          {
            type: 'text',
            text: `FinishKit is configured but the API key may be invalid: ${message}\n\nVisit ${baseUrl}/activate to generate a new key.`,
          },
        ],
      }
    }
  }

  // Case 2: No API key - check for pending session first
  const pending = readPendingSession()

  if (pending) {
    // Try polling the session
    try {
      const res = await fetch(`${baseUrl}/api/cli/device-session/${pending.code}`)
      if (res.ok) {
        const data = await res.json() as { status: string; apiKey?: string | null }

        if (data.status === 'completed' && data.apiKey) {
          writeCredentials(data.apiKey, 'device-session')
          deletePendingSession()
          return {
            content: [
              {
                type: 'text',
                text: [
                  'FinishKit is now connected!',
                  '',
                  'You can now scan your projects. Try:',
                  '  "Scan this project for production readiness"',
                ].join('\n'),
              },
            ],
          }
        }

        if (data.status === 'pending') {
          return {
            content: [
              {
                type: 'text',
                text: [
                  'Waiting for you to finish signing in.',
                  '',
                  `  ${pending.activateUrl}`,
                  '',
                  'Open the link above in your browser. Once done, try again here.',
                ].join('\n'),
              },
            ],
          }
        }
      }
    } catch {
      // Network error, fall through to create new session
    }

    // Session expired or errored - clean up and create a new one
    deletePendingSession()
  }

  // Also check if credentials file appeared (e.g. from CLI login)
  const creds = readCredentials()
  if (creds?.apiKey) {
    return {
      content: [
        {
          type: 'text',
          text: [
            'FinishKit is now connected!',
            '',
            'You can now scan your projects. Try:',
            '  "Scan this project for production readiness"',
          ].join('\n'),
        },
      ],
    }
  }

  // Case 3: Create a new device session
  try {
    const res = await fetch(`${baseUrl}/api/cli/device-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      const data = await res.json() as { code: string; activateUrl: string; expiresAt: string }
      writePendingSession(data.code, data.activateUrl)

      return {
        content: [
          {
            type: 'text',
            text: [
              "Let's connect FinishKit to your editor.",
              '',
              'Open this link in your browser:',
              `  ${data.activateUrl}`,
              '',
              'Free to use. No credit card needed. Takes about 30 seconds.',
              '',
              'After signing in, come back here and try again.',
              '',
              'Prefer the command line? Run:',
              '  npx @finishkit/mcp login',
            ].join('\n'),
          },
        ],
      }
    }
  } catch {
    // Network error - fall back to manual instructions
  }

  // Fallback if device session creation fails
  return {
    content: [
      {
        type: 'text',
        text: [
          "Let's connect FinishKit to your editor.",
          '',
          'Visit this page to get started:',
          `  ${baseUrl}/activate`,
          '',
          'Or run this in your terminal:',
          '  npx @finishkit/mcp login',
          '',
          'Free to use. No credit card needed.',
        ].join('\n'),
      },
    ],
  }
}
