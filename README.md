# @finishkit/mcp

[![npm version](https://img.shields.io/npm/v/@finishkit/mcp)](https://www.npmjs.com/package/@finishkit/mcp)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for FinishKit. Production readiness scanner for AI-built apps. Enables AI agents in Claude, Cursor, Windsurf, and VS Code to check if your code is ready to ship.

## What AI Agents Can Do

| Tool | Description |
|---|---|
| `scan_repo` | Check if your app is ready to ship. Triggers a production readiness scan and returns a prioritized finish plan. |
| `get_scan_status` | Check progress of a production readiness scan. Returns current phase and progress percentage. |
| `get_findings` | Get the production readiness report with prioritized findings blocking launch. |
| `get_patches` | Get auto-generated code patches that fix production readiness issues. |
| `list_projects` | List all repositories connected to FinishKit for production readiness scanning. |
| `create_project` | Get instructions to connect a new GitHub repository to FinishKit. |
| `request_intelligence_pack` | Request a production readiness analysis pack tailored to your technology stack. |
| `sync_findings` | Sync production readiness findings from a local analysis back to the FinishKit dashboard. |
| `finishkit_setup` | Set up FinishKit or check connection status. Creates a browser-based setup link if not connected. |

## Quick Start

No API key required to get started. The server starts in setup mode and guides you through connecting your account.

### Option A: Browser login (recommended)

```
npx @finishkit/mcp login
```

Opens your browser. Sign in with GitHub or Google. Your editor picks up the key automatically. No copy-paste, no config editing, no restart.

### Option B: Setup command

```
npx @finishkit/mcp setup
```

Auto-detects your editor and configures FinishKit. Or target a specific editor:

```
npx @finishkit/mcp setup --claude-code
npx @finishkit/mcp setup --cursor
npx @finishkit/mcp setup --windsurf
npx @finishkit/mcp setup --codex
npx @finishkit/mcp setup --vscode
```

Then ask your AI to scan your project. It will show a setup link if you haven't connected yet.

### Option C: Manual configuration

Add the following to your editor's MCP config file:

**Claude Desktop** (`~/.claude/claude_desktop_config.json`), **Cursor** (`~/.cursor/mcp.json`), **Windsurf** (`~/.codeium/windsurf/mcp_config.json`), **VS Code Copilot** (`.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "finishkit": {
      "command": "npx",
      "args": ["-y", "@finishkit/mcp"],
      "env": {
        "FINISHKIT_API_KEY": "fk_live_your_key_here"
      }
    }
  }
}
```

**Claude Code**:

```
claude mcp add finishkit -- npx -y @finishkit/mcp
```

Get an API key at [finishkit.app/activate](https://finishkit.app/activate).

## Works Without API Key

The server always starts, even without an API key configured. This means FinishKit tools always appear in your IDE.

When called without a key, the `finishkit_setup` tool creates a browser-based activation link. Click the link, sign in, and your editor picks up the key on the next tool call. No restart needed.

Two tools always work without a key:

- `finishkit_setup`: Creates a setup link and checks connection status.
- `create_project`: Returns instructions for connecting a repository through the FinishKit dashboard.

## Tools Reference

### `scan_repo` (Primary Tool)

Check if your app is ready to ship. Triggers a production readiness scan on a GitHub repository, analyzing security, deployment, stability, tests, and UI completeness. Returns a prioritized finish plan with all findings. Typically takes 2-8 minutes.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `repo_owner` | string | Yes | GitHub org or username (e.g., `myorg`) |
| `repo_name` | string | Yes | Repository name without owner (e.g., `my-app`) |
| `run_type` | enum | No | `baseline` (default), `pr`, or `manual_patch` |
| `commit_sha` | string | No | Specific commit to scan; defaults to latest |

Returns: Finding counts by severity and category, human-readable summary, dashboard URL.

---

### `get_scan_status`

Check progress of a production readiness scan. Returns current phase and progress percentage.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID from `scan_repo` or the dashboard |

---

### `get_findings`

Get the production readiness report with prioritized findings blocking launch. Filter by category (blockers, security, deploy, stability, tests, ui) or minimum severity (critical, high, medium, low).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID of a completed scan |
| `category` | enum | No | `blockers`, `security`, `deploy`, `stability`, `tests`, `ui` |
| `severity` | enum | No | Minimum severity: `critical`, `high`, `medium`, `low` |
| `limit` | number | No | Max findings to return (1-100, default 50) |

---

### `get_patches`

Get auto-generated code patches that fix production readiness issues. Each patch includes a unified diff you can apply directly.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID of a completed scan |

---

### `list_projects`

List all repositories connected to FinishKit for production readiness scanning. No inputs required.

---

### `create_project`

Get instructions to connect a new GitHub repository to FinishKit for production readiness scanning. Works without an API key.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `repo_owner` | string | Yes | GitHub org or username |
| `repo_name` | string | Yes | Repository name |

---

### `request_intelligence_pack`

Request a production readiness analysis pack tailored to your technology stack. Returns framework-specific rules, security advisories, and analysis prompts for local scanning.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `framework` | string | Yes | Web framework (e.g., `nextjs`, `remix`, `vite`) |
| `language` | enum | Yes | `typescript` or `javascript` |
| `package_manager` | enum | Yes | `npm`, `pnpm`, `yarn`, or `bun` |
| `framework_version` | string | No | Framework version (e.g., `16.0.0`) |
| `integrations` | array | No | Detected integrations (e.g., `["supabase", "stripe"]`) |
| `dependencies` | object | No | Package versions for CVE lookup |
| `focus` | enum | No | `full` (default), `security`, `api`, `deploy`, `stability` |

---

### `sync_findings`

Sync production readiness findings from a local analysis back to the FinishKit dashboard. Creates a run record and inserts findings with deduplication.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_name` | string | Yes | Project display name |
| `agent_id` | enum | Yes | `claude-code`, `cursor`, `codex`, `windsurf`, `custom` |
| `pack_id` | string | Yes | Intelligence pack ID used |
| `pack_version` | string | Yes | Intelligence pack version used |
| `started_at` | string | Yes | ISO timestamp when analysis started |
| `finished_at` | string | Yes | ISO timestamp when analysis finished |
| `detected_stack` | object | Yes | Detected stack metadata |
| `findings` | array | Yes | Array of findings from the analysis |
| `summary` | string | Yes | Human-readable summary |

---

### `finishkit_setup`

Set up FinishKit or check connection status. If not connected, creates a browser-based activation link. If connected, shows available tools. Always works, even without an API key. No inputs required.

## Resources Reference

| URI | Description |
|---|---|
| `finishkit://projects` | All projects as a JSON array |
| `finishkit://projects/{id}` | Single project details by ID |
| `finishkit://runs/{run_id}/findings` | All findings for a scan run |
| `finishkit://runs/{run_id}/events` | Full event log for a scan run |

## For AI Agents

If you are an AI agent with access to FinishKit MCP tools:

### Primary workflow: Scan a repository

1. Call `scan_repo` with the repository owner and name
2. The tool handles the full lifecycle (trigger, poll, wait for completion)
3. Returns finding counts by severity and category
4. Call `get_findings` for detailed findings list
5. Call `get_patches` for generated code fixes

### Example: User asks "scan myorg/myapp for security issues"

```
scan_repo({ repo_owner: "myorg", repo_name: "myapp", run_type: "baseline" })
```

Then:

```
get_findings({ run_id: "<from scan_repo response>", category: "security" })
```

### Handling common situations

- "FinishKit is not connected": Use `finishkit_setup` to get a browser activation link
- "Project not found": The repository must be connected at https://finishkit.app/dashboard first
- "Authentication failed": The API key is invalid. Run `npx @finishkit/mcp login` to re-authenticate
- "Plan limit reached": User needs to upgrade at https://finishkit.app/dashboard/settings

### Key facts

- `scan_repo` typically takes 2-8 minutes. It blocks until complete, no need to poll separately.
- Findings have severity: critical, high, medium, low
- Findings have category: blockers, security, deploy, stability, tests, ui
- Critical and high findings should be fixed before production deployment

## Authentication

The simplest way to authenticate is `npx @finishkit/mcp login`, which opens your browser and stores the key locally at `~/.finishkit/credentials`.

The MCP resolves API keys in this order:
1. `FINISHKIT_API_KEY` environment variable (highest priority)
2. `~/.finishkit/credentials` file (written by `login` or `setup --api-key`)
3. No key (setup mode with browser activation link)

To get an API key manually:
1. Visit [finishkit.app/activate](https://finishkit.app/activate)
2. Sign in with GitHub or Google
3. Copy the key (starts with `fk_live_`)

API keys authenticate via `Authorization: Bearer <key>` on every request. Keep your key secret and never commit it to source control.

## Requirements

- Node.js 18+
- A FinishKit account ([finishkit.app](https://finishkit.app)) for scanning (optional for setup)
- At least one repository connected to FinishKit via the GitHub App (for scanning)

## Registry Listings

- [Smithery](https://smithery.ai/server/@finishkit/mcp)
- [npm: @finishkit/mcp](https://www.npmjs.com/package/@finishkit/mcp)

## License

MIT - Copyright (c) 2026 FinishKit
