import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import {
  BillingError,
  Finding,
  FinishKit,
  ProjectNotFoundError,
} from '@finishkit/sdk'

interface ScanRepoArgs {
  repo_owner: string
  repo_name: string
  run_type?: 'baseline' | 'pr' | 'manual_patch'
  commit_sha?: string
}

function countBySeverity(findings: Finding[]) {
  let critical = 0
  let high = 0
  let medium = 0
  let low = 0
  for (const f of findings) {
    if (f.severity === 'critical') critical++
    else if (f.severity === 'high') high++
    else if (f.severity === 'medium') medium++
    else if (f.severity === 'low') low++
  }
  return { critical, high, medium, low }
}

function countByCategory(findings: Finding[]) {
  const counts: Record<string, number> = {
    blockers: 0,
    security: 0,
    deploy: 0,
    stability: 0,
    tests: 0,
    ui: 0,
  }
  for (const f of findings) {
    if (f.category in counts) counts[f.category]++
  }
  return counts
}

function buildSummary(
  repoOwner: string,
  repoName: string,
  findingsCount: number,
  bySeverity: { critical: number; high: number; medium: number; low: number },
  byCategory: Record<string, number>,
): string {
  const lines: string[] = []

  lines.push(`FinishKit scan complete for ${repoOwner}/${repoName}.`)
  lines.push('')
  lines.push(`Total findings: ${findingsCount}`)
  lines.push(
    `  Critical: ${bySeverity.critical}  High: ${bySeverity.high}  Medium: ${bySeverity.medium}  Low: ${bySeverity.low}`,
  )
  lines.push('')
  lines.push('Findings by category:')

  const categoryLabels: Record<string, string> = {
    blockers: 'Deployment Blockers',
    security: 'Security',
    deploy: 'Deploy',
    stability: 'Stability',
    tests: 'Test Coverage',
    ui: 'UI/UX',
  }

  for (const [cat, count] of Object.entries(byCategory)) {
    if (count > 0) {
      lines.push(`  ${categoryLabels[cat] ?? cat}: ${count}`)
    }
  }

  if (findingsCount === 0) {
    lines.push('')
    lines.push('No issues found. Your repository looks production-ready!')
  } else if (bySeverity.critical > 0 || bySeverity.high > 0) {
    lines.push('')
    lines.push(
      `Action required: ${bySeverity.critical + bySeverity.high} critical/high severity issue(s) should be addressed before deployment.`,
    )
  }

  return lines.join('\n')
}

export async function scanRepo(
  fk: FinishKit,
  args: ScanRepoArgs,
): Promise<CallToolResult> {
  const { repo_owner, repo_name, run_type = 'baseline', commit_sha } = args

  try {
    const result = await fk.scan({
      repoOwner: repo_owner,
      repoName: repo_name,
      runType: run_type,
      commitSha: commit_sha,
    })

    const { run, findings, patches } = result
    const bySeverity = countBySeverity(findings)
    const byCategory = countByCategory(findings)
    const summary = buildSummary(
      repo_owner,
      repo_name,
      findings.length,
      bySeverity,
      byCategory,
    )

    const dashboardUrl = `https://finishkit.app/dashboard/runs/${run.id}`

    const output = {
      run_id: run.id,
      status: run.status,
      project_id: run.project_id,
      run_type: run.run_type,
      commit_sha: run.commit_sha,
      started_at: run.started_at,
      finished_at: run.finished_at,
      findings_count: findings.length,
      patches_count: patches.length,
      critical_count: bySeverity.critical,
      high_count: bySeverity.high,
      medium_count: bySeverity.medium,
      low_count: bySeverity.low,
      categories: byCategory,
      summary,
      dashboard_url: dashboardUrl,
    }

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
        {
          type: 'text',
          text: JSON.stringify(output, null, 2),
        },
      ],
    }
  } catch (err) {
    if (err instanceof ProjectNotFoundError) {
      return {
        content: [
          {
            type: 'text',
            text: [
              `No FinishKit project found for ${repo_owner}/${repo_name}.`,
              '',
              'To use FinishKit, you must first:',
              '  1. Install the FinishKit GitHub App on your repository',
              '  2. Create a project at https://finishkit.app/dashboard',
              '',
              'Once the project is created, run scan_repo again.',
            ].join('\n'),
          },
        ],
        isError: true,
      }
    }

    if (err instanceof BillingError) {
      return {
        content: [
          {
            type: 'text',
            text: [
              'FinishKit scan limit reached.',
              '',
              (err as Error).message,
              '',
              'To continue scanning:',
              '  - Upgrade your plan at https://finishkit.app/dashboard/settings?tab=billing',
              '  - Or purchase a run top-up pack',
            ].join('\n'),
          },
        ],
        isError: true,
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [
        {
          type: 'text',
          text: `FinishKit scan failed: ${message}`,
        },
      ],
      isError: true,
    }
  }
}

export const scanRepoToolDefinition = {
  name: 'scan_repo',
  description:
    "Check if your app is ready to ship. Triggers a production readiness scan on a GitHub repository, analyzing security, deployment, stability, tests, and UI completeness. Returns a prioritized finish plan with all findings. Use when a user asks 'is my app ready?', 'what do I need before launch?', or 'check production readiness'. Typically takes 2-8 minutes.",
  inputSchema: {
    type: 'object' as const,
    properties: {
      repo_owner: {
        type: 'string',
        description:
          "The GitHub organization or username that owns the repository (e.g., 'myorg' or 'octocat')",
      },
      repo_name: {
        type: 'string',
        description:
          "The GitHub repository name without the owner prefix (e.g., 'my-app' not 'myorg/my-app')",
      },
      run_type: {
        type: 'string',
        enum: ['baseline', 'pr', 'manual_patch'],
        description:
          "The type of scan to run. 'baseline' scans the full codebase (default), 'pr' scans changes in a pull request, 'manual_patch' applies a specific patch.",
      },
      commit_sha: {
        type: 'string',
        description:
          'Specific git commit SHA to scan. If omitted, scans the latest commit on the default branch.',
      },
    },
    required: ['repo_owner', 'repo_name'],
  },
}
