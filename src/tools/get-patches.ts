import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit, Patch } from '@finishkit/sdk'

interface GetPatchesArgs {
  run_id: string
}

function formatPatch(patch: Patch, index: number): string {
  const lines: string[] = []

  lines.push(`[${index + 1}] Patch ID: ${patch.id}`)
  lines.push(
    `    Apply status: ${patch.apply_status}  |  Verify status: ${patch.verify_status}`,
  )

  if (patch.branch_name) {
    lines.push(`    Branch: ${patch.branch_name}`)
  }

  if (patch.pr_url) {
    lines.push(`    Pull Request: ${patch.pr_url}`)
  }

  if (patch.finding_id) {
    lines.push(`    Fixes finding: ${patch.finding_id}`)
  }

  if (patch.diff) {
    const diffPreview =
      patch.diff.length > 500
        ? patch.diff.slice(0, 497) + '\n... (truncated, full diff in JSON)'
        : patch.diff
    lines.push(`    Diff:\n${diffPreview.split('\n').map((l) => `      ${l}`).join('\n')}`)
  }

  return lines.join('\n')
}

export async function getPatches(
  fk: FinishKit,
  args: GetPatchesArgs,
): Promise<CallToolResult> {
  try {
    const outcomes = await fk.runs.outcomes(args.run_id)
    const { patches } = outcomes

    const headerLines: string[] = [
      `FinishKit Patches for run ${args.run_id}`,
      `Total patches: ${patches.length}`,
      '',
    ]

    const patchLines =
      patches.length > 0
        ? patches.map((p, i) => formatPatch(p, i)).join('\n\n')
        : 'No patches were generated for this run.'

    const summaryText = [...headerLines, patchLines].join('\n')

    // Aggregate stats
    const applySucceeded = patches.filter(
      (p) => p.apply_status === 'applied',
    ).length
    const verifySucceeded = patches.filter(
      (p) => p.verify_status === 'passed',
    ).length

    return {
      content: [
        {
          type: 'text',
          text: summaryText,
        },
        {
          type: 'text',
          text: JSON.stringify(
            {
              run_id: args.run_id,
              total_patches: patches.length,
              applied_count: applySucceeded,
              verified_count: verifySucceeded,
              patches: patches.map((p) => ({
                id: p.id,
                finding_id: p.finding_id,
                diff: p.diff,
                branch_name: p.branch_name,
                apply_status: p.apply_status,
                verify_status: p.verify_status,
                verify_summary: p.verify_summary,
                pr_url: p.pr_url,
                created_at: p.created_at,
              })),
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
          text: `Failed to retrieve patches: ${message}`,
        },
      ],
      isError: true,
    }
  }
}

export const getPatchesToolDefinition = {
  name: 'get_patches',
  description:
    'Retrieve automatically generated code patches from a completed FinishKit scan. Patches are diff-format code changes that fix detected issues. Each patch includes the affected finding title, the unified diff, application status, and verification status. Use this to see what code changes FinishKit recommends, or to apply fixes to the codebase.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      run_id: {
        type: 'string',
        description: 'The FinishKit run ID to retrieve patches for',
      },
    },
    required: ['run_id'],
  },
}
