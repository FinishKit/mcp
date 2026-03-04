import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'

export async function readProjectsResource(
  fk: FinishKit,
): Promise<ReadResourceResult> {
  const projects = await fk.projects.list()

  return {
    contents: [
      {
        uri: 'finishkit://projects',
        mimeType: 'application/json',
        text: JSON.stringify(
          projects.map((p) => ({
            id: p.id,
            repo_owner: p.repo_owner,
            repo_name: p.repo_name,
            default_branch: p.default_branch,
            last_scanned_at: p.last_scanned_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
          })),
          null,
          2,
        ),
      },
    ],
  }
}

export async function readProjectResource(
  fk: FinishKit,
  projectId: string,
): Promise<ReadResourceResult> {
  const project = await fk.projects.get(projectId)

  return {
    contents: [
      {
        uri: `finishkit://projects/${projectId}`,
        mimeType: 'application/json',
        text: JSON.stringify(project, null, 2),
      },
    ],
  }
}
