import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { Finding, FindingCategory, FindingSeverity, FinishKit } from '@finishkit/sdk'

interface GetFindingsArgs {
  run_id: string
  category?: FindingCategory
  severity?: FindingSeverity
  limit?: number
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function formatFinding(finding: Finding, index: number): string {
  const lines: string[] = []

  lines.push(`[${index + 1}] ${finding.title}`)
  lines.push(
    `    Severity: ${finding.severity.toUpperCase()}  |  Category: ${finding.category}`,
  )

  if (finding.file_path) {
    const loc =
      finding.line_start != null
        ? ` (lines ${finding.line_start}${finding.line_end && finding.line_end !== finding.line_start ? `-${finding.line_end}` : ''})`
        : ''
    lines.push(`    File: ${finding.file_path}${loc}`)
  }

  if (finding.detail_md) {
    // Truncate to first 300 chars for summary view
    const detail =
      finding.detail_md.length > 300
        ? finding.detail_md.slice(0, 297) + '...'
        : finding.detail_md
    lines.push(`    Detail: ${detail.replace(/\n/g, ' ')}`)
  }

  if (finding.confidence != null) {
    lines.push(`    Confidence: ${Math.round(finding.confidence * 100)}%`)
  }

  return lines.join('\n')
}

export async function getFindings(
  fk: FinishKit,
  args: GetFindingsArgs,
): Promise<CallToolResult> {
  const { run_id, category, severity, limit = 50 } = args
  const clampedLimit = Math.min(Math.max(1, limit), 100)

  try {
    const outcomes = await fk.runs.outcomes(run_id)
    let findings = outcomes.findings

    // Apply category filter
    if (category) {
      findings = findings.filter((f) => f.category === category)
    }

    // Apply severity filter - return this severity and above
    if (severity) {
      const minOrder = SEVERITY_ORDER[severity]
      findings = findings.filter(
        (f) => SEVERITY_ORDER[f.severity] <= minOrder,
      )
    }

    // Sort by severity (critical first)
    findings.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    )

    // Apply limit
    const total = findings.length
    findings = findings.slice(0, clampedLimit)

    // Build human-readable summary
    const filterDesc: string[] = []
    if (category) filterDesc.push(`category=${category}`)
    if (severity) filterDesc.push(`severity>=${severity}`)
    const filterStr = filterDesc.length > 0 ? ` (filtered: ${filterDesc.join(', ')})` : ''

    const headerLines: string[] = [
      `FinishKit Findings for run ${run_id}${filterStr}`,
      `Showing ${findings.length} of ${total} findings (limit: ${clampedLimit})`,
      '',
    ]

    const findingLines =
      findings.length > 0
        ? findings.map((f, i) => formatFinding(f, i)).join('\n\n')
        : 'No findings match the specified filters.'

    const summaryText = [...headerLines, findingLines].join('\n')

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
              run_id,
              total_matching: total,
              returned: findings.length,
              filters: { category: category ?? null, severity: severity ?? null, limit: clampedLimit },
              findings: findings.map((f) => ({
                id: f.id,
                title: f.title,
                category: f.category,
                severity: f.severity,
                file_path: f.file_path,
                line_start: f.line_start,
                line_end: f.line_end,
                detail_md: f.detail_md,
                suggested_fix: f.suggested_fix,
                confidence: f.confidence,
                fingerprint: f.fingerprint,
                created_at: f.created_at,
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
          text: `Failed to retrieve findings: ${message}`,
        },
      ],
      isError: true,
    }
  }
}

export const getFindingsToolDefinition = {
  name: 'get_findings',
  description:
    'Retrieve detailed findings from a completed FinishKit scan. Findings include security vulnerabilities, deployment blockers, stability issues, test gaps, and UI problems. Each finding includes the affected file path, line numbers, severity, category, detailed explanation, and suggested fix. Use this after scan_repo completes to get the full list of issues, optionally filtered by category or severity.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      run_id: {
        type: 'string',
        description:
          'The FinishKit run ID to retrieve findings for (returned by scan_repo or get_scan_status)',
      },
      category: {
        type: 'string',
        enum: ['blockers', 'security', 'deploy', 'stability', 'tests', 'ui'],
        description:
          'Filter findings to a specific category. Omit to get all findings.',
      },
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description:
          'Filter findings to a specific minimum severity level. For example, "high" returns critical and high findings. Omit to get all severities.',
      },
      limit: {
        type: 'number',
        description:
          'Maximum number of findings to return (1-100). Defaults to 50.',
      },
    },
    required: ['run_id'],
  },
}
