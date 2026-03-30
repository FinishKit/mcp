import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'

interface RequestIntelligencePackArgs {
  framework: string
  framework_version?: string
  language: 'typescript' | 'javascript'
  package_manager: 'npm' | 'pnpm' | 'yarn' | 'bun'
  integrations?: string[]
  dependencies?: Record<string, string>
  focus?: 'full' | 'security' | 'api' | 'deploy' | 'stability'
}

export async function requestIntelligencePack(
  fk: FinishKit,
  args: RequestIntelligencePackArgs,
): Promise<CallToolResult> {
  try {
    const pack = await fk.intelligence.getPack({
      detectedStack: {
        framework: args.framework,
        frameworkVersion: args.framework_version,
        language: args.language,
        packageManager: args.package_manager,
        integrations: args.integrations ?? [],
        dependencies: args.dependencies,
      },
      focus: args.focus,
    })

    const summary = [
      `Intelligence pack generated for ${args.framework}${args.framework_version ? ' v' + args.framework_version : ''}.`,
      '',
      `Pack ID: ${pack.packId}`,
      `Tier: ${pack.tier}`,
      `Version: ${pack.version}`,
      `Expires: ${pack.expiresAt}`,
      `Analysis passes: ${pack.passes.filter(p => p.enabled).length} enabled`,
      `Framework rules: ${pack.frameworkRules.length}`,
      `Advisories: ${pack.advisories.length}`,
      pack.communityPatterns ? `Community patterns: ${pack.communityPatterns.topFindings.length} top findings` : '',
      pack.docContext ? `Doc pitfalls: ${pack.docContext.pitfalls.length}` : '',
    ].filter(Boolean).join('\n')

    return {
      content: [
        { type: 'text', text: summary },
        { type: 'text', text: JSON.stringify(pack, null, 2) },
      ],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Failed to request intelligence pack: ${message}` }],
      isError: true,
    }
  }
}

export const requestIntelligencePackToolDefinition = {
  name: 'request_intelligence_pack',
  description:
    'Request a production readiness analysis pack tailored to your technology stack. Returns framework-specific rules, security advisories, and analysis prompts for local scanning.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      framework: {
        type: 'string',
        description: "The web framework (e.g., 'nextjs', 'remix', 'vite', 'nuxt', 'sveltekit', 'astro')",
      },
      framework_version: {
        type: 'string',
        description: "The framework version (e.g., '16.0.0')",
      },
      language: {
        type: 'string',
        enum: ['typescript', 'javascript'],
        description: 'The primary language',
      },
      package_manager: {
        type: 'string',
        enum: ['npm', 'pnpm', 'yarn', 'bun'],
        description: 'The package manager',
      },
      integrations: {
        type: 'array',
        items: { type: 'string' },
        description: "Third-party integrations detected (e.g., ['supabase', 'stripe', 'github'])",
      },
      dependencies: {
        type: 'object',
        description: 'Map of package name to version for CVE lookup (e.g., {"next": "16.0.0", "react": "19.0.0"})',
      },
      focus: {
        type: 'string',
        enum: ['full', 'security', 'api', 'deploy', 'stability'],
        description: "Focus area for the pack. 'full' covers all domains (default).",
      },
    },
    required: ['framework', 'language', 'package_manager'],
  },
}
