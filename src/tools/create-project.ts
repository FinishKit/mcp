import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

interface CreateProjectArgs {
  repo_owner: string
  repo_name: string
}

/**
 * create_project tool
 *
 * Note: Creating a project via API key requires a GitHub installation ID,
 * which is only available through the OAuth flow in the FinishKit dashboard.
 * This tool provides a helpful redirect to the dashboard.
 */
export async function createProject(
  args: CreateProjectArgs,
): Promise<CallToolResult> {
  const { repo_owner, repo_name } = args

  return {
    content: [
      {
        type: 'text',
        text: [
          `To create a FinishKit project for ${repo_owner}/${repo_name}:`,
          '',
          'Creating projects requires the FinishKit GitHub App to be installed on your repository.',
          'This setup must be done through the web interface:',
          '',
          '  1. Go to https://finishkit.app/dashboard',
          '  2. Click "New Project"',
          '  3. Install the FinishKit GitHub App if prompted',
          '  4. Select the repository: ' + repo_owner + '/' + repo_name,
          '  5. Click "Create Project"',
          '',
          'Once the project is created, you can use scan_repo to trigger scans via the API.',
          '',
          'Dashboard: https://finishkit.app/dashboard',
        ].join('\n'),
      },
    ],
  }
}

export const createProjectToolDefinition = {
  name: 'create_project',
  description:
    'Get instructions to connect a new GitHub repository to FinishKit for production readiness scanning.',
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
    },
    required: ['repo_owner', 'repo_name'],
  },
}
