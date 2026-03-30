import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit, BillingError } from '@finishkit/sdk'

interface SyncFindingsArgs {
  project_name: string
  repo_owner?: string
  repo_name?: string
  provider?: 'github' | 'gitlab' | 'local'
  agent_id: 'claude-code' | 'cursor' | 'codex' | 'windsurf' | 'custom'
  pack_id: string
  pack_version: string
  run_type?: 'baseline' | 'pr' | 'manual_patch'
  commit_sha?: string
  branch_name?: string
  started_at: string
  finished_at: string
  detected_stack: Record<string, unknown>
  findings: Array<{
    category: string
    severity: string
    confidence: number
    title: string
    detail_md: string
    file_path: string
    line_start?: number | null
    line_end?: number | null
    fingerprint: string
    pr_task: {
      title: string
      description: string
      acceptance_criteria: string[]
      files_affected: string[]
      suggested_approach: string
      verification_commands: string[]
    }
    fixApplied?: boolean
    fixVerified?: boolean
  }>
  summary: string
  token_usage?: { input: number; output: number; model: string }
}

export async function syncFindings(
  fk: FinishKit,
  args: SyncFindingsArgs,
): Promise<CallToolResult> {
  try {
    const result = await fk.intelligence.syncFindings({
      project: {
        name: args.project_name,
        repoOwner: args.repo_owner,
        repoName: args.repo_name,
        provider: (args.provider ?? 'local') as any,
      },
      run: {
        source: 'agent',
        agentId: args.agent_id as any,
        packId: args.pack_id,
        packVersion: args.pack_version,
        runType: (args.run_type ?? 'baseline') as any,
        commitSha: args.commit_sha,
        branchName: args.branch_name,
        startedAt: args.started_at,
        finishedAt: args.finished_at,
        detectedStack: args.detected_stack,
      },
      findings: args.findings as any,
      summary: args.summary,
      tokenUsage: args.token_usage,
    })

    const summary = [
      `Findings synced to FinishKit dashboard.`,
      '',
      `Project: ${result.project.id}${result.project.created ? ' (newly created)' : ''}`,
      `Run: ${result.run.id}`,
      `Dashboard: ${result.run.dashboardUrl}`,
      '',
      `Findings created: ${result.findings.created}`,
      `Findings deduplicated: ${result.findings.deduplicated}`,
      `Credits remaining: ${result.billing.runsRemaining}`,
    ].join('\n')

    return {
      content: [
        { type: 'text', text: summary },
        { type: 'text', text: JSON.stringify(result, null, 2) },
      ],
    }
  } catch (err) {
    if (err instanceof BillingError) {
      return {
        content: [{
          type: 'text',
          text: [
            'FinishKit sync limit reached.',
            '',
            (err as Error).message,
            '',
            'Upgrade at https://finishkit.app/dashboard/settings?tab=billing',
          ].join('\n'),
        }],
        isError: true,
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Failed to sync findings: ${message}` }],
      isError: true,
    }
  }
}

export const syncFindingsToolDefinition = {
  name: 'sync_findings',
  description:
    'Sync production readiness findings from a local analysis back to the FinishKit dashboard. Creates a run record and inserts findings with deduplication.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      project_name: {
        type: 'string',
        description: 'Project display name',
      },
      repo_owner: {
        type: 'string',
        description: 'GitHub org/user that owns the repo (optional, for linking)',
      },
      repo_name: {
        type: 'string',
        description: 'Repository name (optional, for linking)',
      },
      provider: {
        type: 'string',
        enum: ['github', 'gitlab', 'local'],
        description: "Code provider. Defaults to 'local'.",
      },
      agent_id: {
        type: 'string',
        enum: ['claude-code', 'cursor', 'codex', 'windsurf', 'custom'],
        description: 'Which AI agent performed the analysis',
      },
      pack_id: { type: 'string', description: 'Intelligence pack ID used' },
      pack_version: { type: 'string', description: 'Intelligence pack version used' },
      run_type: {
        type: 'string',
        enum: ['baseline', 'pr', 'manual_patch'],
        description: "Type of scan. Defaults to 'baseline'.",
      },
      commit_sha: { type: 'string', description: 'Git commit SHA (optional)' },
      branch_name: { type: 'string', description: 'Git branch name (optional)' },
      started_at: { type: 'string', description: 'ISO timestamp when analysis started' },
      finished_at: { type: 'string', description: 'ISO timestamp when analysis finished' },
      detected_stack: {
        type: 'object',
        description: 'Detected stack metadata (framework, language, integrations)',
      },
      findings: {
        type: 'array',
        description: 'Array of findings from the analysis',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['blockers', 'security', 'deploy', 'stability', 'tests', 'ui'] },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            confidence: { type: 'number', description: '0.0 to 1.0' },
            title: { type: 'string' },
            detail_md: { type: 'string' },
            file_path: { type: 'string' },
            line_start: { type: 'number' },
            line_end: { type: 'number' },
            fingerprint: { type: 'string', description: 'SHA-256 hash for deduplication' },
            pr_task: { type: 'object' },
            fixApplied: { type: 'boolean' },
            fixVerified: { type: 'boolean' },
          },
          required: ['category', 'severity', 'confidence', 'title', 'detail_md', 'file_path', 'fingerprint', 'pr_task'],
        },
      },
      summary: { type: 'string', description: 'Human-readable summary of the analysis' },
      token_usage: {
        type: 'object',
        description: 'Token usage stats (optional)',
        properties: {
          input: { type: 'number' },
          output: { type: 'number' },
          model: { type: 'string' },
        },
      },
    },
    required: ['project_name', 'agent_id', 'pack_id', 'pack_version', 'started_at', 'finished_at', 'detected_stack', 'findings', 'summary'],
  },
}
