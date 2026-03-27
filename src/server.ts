import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'

import { scanRepo, scanRepoToolDefinition } from './tools/scan-repo.js'
import { getScanStatus, getScanStatusToolDefinition } from './tools/get-status.js'
import { getFindings, getFindingsToolDefinition } from './tools/get-findings.js'
import { getPatches, getPatchesToolDefinition } from './tools/get-patches.js'
import { listProjects, listProjectsToolDefinition } from './tools/list-projects.js'
import { createProject, createProjectToolDefinition } from './tools/create-project.js'
import { requestIntelligencePack, requestIntelligencePackToolDefinition } from './tools/request-intelligence-pack.js'
import { syncFindings, syncFindingsToolDefinition } from './tools/sync-findings.js'
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
]

export function createFinishKitServer(fk: FinishKit): Server {
  const server = new Server(
    {
      name: 'finishkit-mcp',
      version: '0.1.0',
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

    switch (name) {
      case 'scan_repo':
        return scanRepo(fk, {
          repo_owner: String(safeArgs.repo_owner ?? ''),
          repo_name: String(safeArgs.repo_name ?? ''),
          run_type: safeArgs.run_type as 'baseline' | 'pr' | 'manual_patch' | undefined,
          commit_sha: safeArgs.commit_sha != null ? String(safeArgs.commit_sha) : undefined,
        })

      case 'get_scan_status':
        return getScanStatus(fk, {
          run_id: String(safeArgs.run_id ?? ''),
        })

      case 'get_findings':
        return getFindings(fk, {
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
        return getPatches(fk, {
          run_id: String(safeArgs.run_id ?? ''),
        })

      case 'list_projects':
        return listProjects(fk)

      case 'create_project':
        return createProject({
          repo_owner: String(safeArgs.repo_owner ?? ''),
          repo_name: String(safeArgs.repo_name ?? ''),
        })

      case 'request_intelligence_pack':
        return requestIntelligencePack(fk, {
          framework: String(safeArgs.framework ?? ''),
          framework_version: safeArgs.framework_version != null ? String(safeArgs.framework_version) : undefined,
          language: safeArgs.language as 'typescript' | 'javascript',
          package_manager: safeArgs.package_manager as 'npm' | 'pnpm' | 'yarn' | 'bun',
          integrations: Array.isArray(safeArgs.integrations) ? safeArgs.integrations.map(String) : undefined,
          dependencies: safeArgs.dependencies as Record<string, string> | undefined,
          focus: safeArgs.focus as 'full' | 'security' | 'api' | 'deploy' | 'stability' | undefined,
        })

      case 'sync_findings':
        return syncFindings(fk, safeArgs as any)

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
