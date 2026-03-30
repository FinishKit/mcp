import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit, Project } from '@finishkit/sdk'

function formatProject(project: Project, index: number): string {
  const lines: string[] = []

  lines.push(`[${index + 1}] ${project.repo_owner}/${project.repo_name}`)
  lines.push(`    ID: ${project.id}`)
  lines.push(
    `    Last scanned: ${project.last_scanned_at ? new Date(project.last_scanned_at).toLocaleString() : 'Never'}`,
  )
  lines.push(`    Default branch: ${project.default_branch}`)
  lines.push(
    `    Created: ${new Date(project.created_at).toLocaleDateString()}`,
  )

  return lines.join('\n')
}

export async function listProjects(fk: FinishKit): Promise<CallToolResult> {
  try {
    const projects = await fk.projects.list()

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: [
              'No FinishKit projects found for this account.',
              '',
              'To create a project:',
              '  1. Install the FinishKit GitHub App on your repository',
              '  2. Visit https://finishkit.app/dashboard to create your first project',
            ].join('\n'),
          },
        ],
      }
    }

    const headerLines = [
      `FinishKit Projects (${projects.length} total)`,
      '',
    ]

    const projectLines = projects
      .map((p, i) => formatProject(p, i))
      .join('\n\n')

    const summaryText = [...headerLines, projectLines].join('\n')

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
              total: projects.length,
              projects: projects.map((p) => ({
                id: p.id,
                repo_owner: p.repo_owner,
                repo_name: p.repo_name,
                default_branch: p.default_branch,
                last_scanned_at: p.last_scanned_at,
                created_at: p.created_at,
                updated_at: p.updated_at,
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
          text: `Failed to list projects: ${message}`,
        },
      ],
      isError: true,
    }
  }
}

export const listProjectsToolDefinition = {
  name: 'list_projects',
  description:
    'List all repositories connected to FinishKit for production readiness scanning.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
}
