import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  CallToolResult,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'
import { readCredentials, readPendingSession, writeCredentials, deletePendingSession } from './credentials.js'

import { scanRepo, scanRepoToolDefinition } from './tools/scan-repo.js'
import { getScanStatus, getScanStatusToolDefinition } from './tools/get-status.js'
import { getFindings, getFindingsToolDefinition } from './tools/get-findings.js'
import { getPatches, getPatchesToolDefinition } from './tools/get-patches.js'
import { listProjects, listProjectsToolDefinition } from './tools/list-projects.js'
import { createProject, createProjectToolDefinition } from './tools/create-project.js'
import { requestIntelligencePack, requestIntelligencePackToolDefinition } from './tools/request-intelligence-pack.js'
import { syncFindings, syncFindingsToolDefinition } from './tools/sync-findings.js'
import { finishkitSetup, finishkitSetupToolDefinition } from './tools/setup.js'
import {
  readProjectsResource,
  readProjectResource,
} from './resources/projects.js'
import {
  readRunFindingsResource,
  readRunEventsResource,
} from './resources/runs.js'

const TOOL_DEFINITIONS = [
  scanRepoToolDefinition,
  getScanStatusToolDefinition,
  getFindingsToolDefinition,
  getPatchesToolDefinition,
  listProjectsToolDefinition,
  createProjectToolDefinition,
  requestIntelligencePackToolDefinition,
  syncFindingsToolDefinition,
  finishkitSetupToolDefinition,
]

function noApiKeyResponse(toolName: string, baseUrl: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: [
          `FinishKit is not connected yet. To use "${toolName}", you need to set up FinishKit first.`,
          '',
          'Run the finishkit_setup tool to get a setup link, or visit:',
          `  ${baseUrl}/activate`,
          '',
          'Free to use. No credit card needed.',
        ].join('\n'),
      },
    ],
  }
}

async function tryRecoverFromPendingSession(baseUrl: string): Promise<string | null> {
  // First check if credentials file was written by another process (e.g., CLI login)
  const creds = readCredentials()
  if (creds?.apiKey) return creds.apiKey

  // Check for pending device session
  const pending = readPendingSession()
  if (!pending) return null

  try {
    const res = await fetch(`${baseUrl}/api/cli/device-session/${pending.code}`)
    if (!res.ok) {
      deletePendingSession()
      return null
    }

    const data = await res.json() as { status: string; apiKey?: string | null }

    if (data.status === 'completed' && data.apiKey) {
      writeCredentials(data.apiKey, 'device-session')
      deletePendingSession()
      return data.apiKey
    }

    if (data.status === 'expired') {
      deletePendingSession()
    }

    return null
  } catch {
    return null
  }
}

export function createFinishKitServer(initialFk: FinishKit | null, baseUrl: string = 'https://finishkit.app'): Server {
  let fk = initialFk
  const server = new Server(
    {
      name: 'finishkit-mcp',
      version: '0.3.2',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  )

  // ---------------------------------------------------------------------------
  // Tool list handler
  // ---------------------------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS,
    }
  })

  // ---------------------------------------------------------------------------
  // Tool call handler
  // ---------------------------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const safeArgs = (args ?? {}) as Record<string, unknown>

    // Guard: tools that require an API key
    if (name !== 'finishkit_setup' && name !== 'create_project' && !fk) {
      // Try to recover from a pending device session or credentials file
      const recovered = await tryRecoverFromPendingSession(baseUrl)
      if (recovered) {
        fk = new FinishKit({ apiKey: recovered, baseUrl })
      } else {
        return noApiKeyResponse(name, baseUrl)
      }
    }

    // After the guard, fk is non-null for all tools except finishkit_setup and create_project.
    // Use non-null assertion for tools that need the client.
    const client = fk!

    switch (name) {
      case 'finishkit_setup':
        return finishkitSetup(fk, baseUrl)

      case 'scan_repo':
        return scanRepo(client, {
          repo_owner: String(safeArgs.repo_owner ?? ''),
          repo_name: String(safeArgs.repo_name ?? ''),
          run_type: safeArgs.run_type as 'baseline' | 'pr' | 'manual_patch' | undefined,
          commit_sha: safeArgs.commit_sha != null ? String(safeArgs.commit_sha) : undefined,
        })

      case 'get_scan_status':
        return getScanStatus(client, {
          run_id: String(safeArgs.run_id ?? ''),
        })

      case 'get_findings':
        return getFindings(client, {
          run_id: String(safeArgs.run_id ?? ''),
          category: safeArgs.category as
            | 'blockers'
            | 'security'
            | 'deploy'
            | 'stability'
            | 'tests'
            | 'ui'
            | undefined,
          severity: safeArgs.severity as
            | 'critical'
            | 'high'
            | 'medium'
            | 'low'
            | undefined,
          limit:
            safeArgs.limit != null ? Number(safeArgs.limit) : undefined,
        })

      case 'get_patches':
        return getPatches(client, {
          run_id: String(safeArgs.run_id ?? ''),
        })

      case 'list_projects':
        return listProjects(client)

      case 'create_project':
        return createProject({
          repo_owner: String(safeArgs.repo_owner ?? ''),
          repo_name: String(safeArgs.repo_name ?? ''),
        })

      case 'request_intelligence_pack':
        return requestIntelligencePack(client, {
          framework: String(safeArgs.framework ?? ''),
          framework_version: safeArgs.framework_version != null ? String(safeArgs.framework_version) : undefined,
          language: safeArgs.language as 'typescript' | 'javascript',
          package_manager: safeArgs.package_manager as 'npm' | 'pnpm' | 'yarn' | 'bun',
          integrations: Array.isArray(safeArgs.integrations) ? safeArgs.integrations.map(String) : undefined,
          dependencies: safeArgs.dependencies as Record<string, string> | undefined,
          focus: safeArgs.focus as 'full' | 'security' | 'api' | 'deploy' | 'stability' | undefined,
        })

      case 'sync_findings':
        return syncFindings(client, safeArgs as any)

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        }
    }
  })

  // ---------------------------------------------------------------------------
  // Resource list handler
  // ---------------------------------------------------------------------------
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'finishkit://projects',
          name: 'FinishKit Projects',
          description:
            'All FinishKit projects for the authenticated user as a JSON array. Each project includes id, repo_owner, repo_name, last_scanned_at, and created_at.',
          mimeType: 'application/json',
        },
      ],
    }
  })

  // ---------------------------------------------------------------------------
  // Resource read handler
  // ---------------------------------------------------------------------------
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params

    if (!fk) {
      throw new Error('FinishKit is not connected. Use the finishkit_setup tool to get started.')
    }

    // finishkit://projects - list all projects
    if (uri === 'finishkit://projects') {
      return readProjectsResource(fk)
    }

    // finishkit://projects/{id} - single project
    const projectMatch = uri.match(/^finishkit:\/\/projects\/([^/]+)$/)
    if (projectMatch) {
      const projectId = decodeURIComponent(projectMatch[1])
      return readProjectResource(fk, projectId)
    }

    // finishkit://runs/{run_id}/findings
    const findingsMatch = uri.match(
      /^finishkit:\/\/runs\/([^/]+)\/findings$/,
    )
    if (findingsMatch) {
      const runId = decodeURIComponent(findingsMatch[1])
      return readRunFindingsResource(fk, runId)
    }

    // finishkit://runs/{run_id}/events
    const eventsMatch = uri.match(/^finishkit:\/\/runs\/([^/]+)\/events$/)
    if (eventsMatch) {
      const runId = decodeURIComponent(eventsMatch[1])
      return readRunEventsResource(fk, runId)
    }

    throw new Error(`Unknown resource URI: ${uri}`)
  })

  return server
}
