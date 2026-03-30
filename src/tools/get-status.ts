import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'

interface GetScanStatusArgs {
  run_id: string
}

const PHASE_ORDER = [
  'clone',
  'detect',
  'analyze',
  'patch',
  'verify',
  'pr',
  'finalize',
]

function estimateTimeRemaining(
  progress: number,
  startedAt: string | null,
): string | null {
  if (!startedAt || progress <= 0) return null

  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
  if (elapsed <= 0) return null

  const rate = progress / elapsed // percent per second
  if (rate <= 0) return null

  const remaining = (100 - progress) / rate
  if (remaining < 60) return `~${Math.round(remaining)}s`
  return `~${Math.round(remaining / 60)}m`
}

export async function getScanStatus(
  fk: FinishKit,
  args: GetScanStatusArgs,
): Promise<CallToolResult> {
  try {
    const run = await fk.runs.get(args.run_id)

    // Determine the current phase from the run events (best-effort)
    const currentPhaseIndex = run.progress
      ? Math.floor((run.progress / 100) * PHASE_ORDER.length)
      : 0
    const estimatedPhase =
      PHASE_ORDER[Math.min(currentPhaseIndex, PHASE_ORDER.length - 1)] ??
      'unknown'

    const eta = estimateTimeRemaining(run.progress, run.started_at)

    const isTerminal = ['done', 'failed', 'canceled'].includes(run.status)

    const lines: string[] = [
      `Run ID: ${run.id}`,
      `Status: ${run.status}`,
      `Progress: ${run.progress}%`,
      `Estimated phase: ${estimatedPhase}`,
    ]

    if (run.started_at) {
      lines.push(`Started at: ${run.started_at}`)
    }

    if (run.finished_at) {
      lines.push(`Finished at: ${run.finished_at}`)
    } else if (!isTerminal && eta) {
      lines.push(`Estimated time remaining: ${eta}`)
    }

    if (run.status === 'failed') {
      const errorMsg =
        (run.summary as { error?: string } | null)?.error ??
        'Scan failed. Check the dashboard for details.'
      lines.push(``)
      lines.push(`Error: ${errorMsg}`)
    }

    if (run.status === 'done') {
      lines.push(``)
      lines.push(
        `Scan complete! Use get_findings to retrieve detailed results.`,
      )
      lines.push(
        `Dashboard: https://finishkit.app/dashboard/runs/${run.id}`,
      )
    }

    return {
      content: [
        {
          type: 'text',
          text: lines.join('\n'),
        },
        {
          type: 'text',
          text: JSON.stringify(
            {
              run_id: run.id,
              status: run.status,
              progress: run.progress,
              estimated_phase: estimatedPhase,
              run_type: run.run_type,
              project_id: run.project_id,
              commit_sha: run.commit_sha,
              started_at: run.started_at,
              finished_at: run.finished_at,
              estimated_time_remaining: eta,
              dashboard_url: `https://finishkit.app/dashboard/runs/${run.id}`,
            },
            null,
            2,
          ),
        },
      ],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get scan status: ${message}`,
        },
      ],
      isError: true,
    }
  }
}

export const getScanStatusToolDefinition = {
  name: 'get_scan_status',
  description:
    'Check progress of a production readiness scan. Returns current phase and progress percentage.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      run_id: {
        type: 'string',
        description:
          'The FinishKit run ID returned by scan_repo or any runs API call',
      },
    },
    required: ['run_id'],
  },
}
