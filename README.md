# @finishkit/mcp

[![npm version](https://img.shields.io/npm/v/@finishkit/mcp)](https://www.npmjs.com/package/@finishkit/mcp)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for FinishKit. Enables AI agents in Cursor, Claude Desktop, Windsurf, and VS Code Copilot to scan GitHub repositories for security vulnerabilities, deployment blockers, and code quality issues.

## What AI Agents Can Do

| Tool | Description | Primary Use Case |
|---|---|---|
| `scan_repo` | Trigger a full scan and wait for completion | Check if a repo is production-ready |
| `get_scan_status` | Check progress of an in-flight scan | Poll a previously triggered scan |
| `get_findings` | Retrieve detailed findings filtered by category or severity | Review security issues, blockers, etc. |
| `get_patches` | Retrieve auto-generated code patches with unified diffs | Apply FinishKit's suggested fixes |
| `list_projects` | List all connected repositories and last scan dates | Discover which repos are configured |
| `create_project` | Get guided instructions to link a new GitHub repo | Onboard a new repository |

## Quick Start

Get an API key at [finishkit.app/dashboard/settings?tab=developer](https://finishkit.app/dashboard/settings?tab=developer), then configure your MCP client.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "finishkit": {
      "command": "npx",
      "args": ["-y", "@finishkit/mcp"],
      "env": {
        "FINISHKIT_API_KEY": "fk_live_..."
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` globally):

```json
{
  "finishkit": {
    "command": "npx",
    "args": ["-y", "@finishkit/mcp"],
    "env": {
      "FINISHKIT_API_KEY": "fk_live_..."
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "finishkit": {
    "command": "npx",
    "args": ["-y", "@finishkit/mcp"],
    "env": {
      "FINISHKIT_API_KEY": "fk_live_..."
    }
  }
}
```

### VS Code Copilot Chat

Add to `.vscode/mcp.json` in your workspace (or user settings):

```json
{
  "servers": {
    "finishkit": {
      "command": "npx",
      "args": ["-y", "@finishkit/mcp"],
      "env": {
        "FINISHKIT_API_KEY": "${env:FINISHKIT_API_KEY}"
      }
    }
  }
}
```

After configuring, restart your AI client and try: *"Scan myorg/my-app for security issues"*

## Tools Reference

### `scan_repo` (Primary Tool)

Scan a GitHub repository with FinishKit to detect security vulnerabilities, deployment blockers, stability issues, test coverage gaps, and UI problems. This is the primary tool - it handles the full scan lifecycle: finds the project, triggers a new scan run, polls until completion (typically 2-8 minutes), and returns a comprehensive summary of all findings.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `repo_owner` | string | Yes | GitHub org or username (e.g., `myorg`) |
| `repo_name` | string | Yes | Repository name without owner (e.g., `my-app`) |
| `run_type` | enum | No | `baseline` (default), `pr`, or `manual_patch` |
| `commit_sha` | string | No | Specific commit to scan; defaults to latest |

Returns: Finding counts by severity and category, human-readable summary, dashboard URL.

---

### `get_scan_status`

Check the current status of an in-progress FinishKit scan. Returns the scan phase, progress percentage, and estimated time remaining. Use this to check a scan triggered in a previous session.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID from `scan_repo` or the dashboard |

---

### `get_findings`

Retrieve detailed findings from a completed scan. Each finding includes file path, line numbers, severity, category, detailed explanation, and suggested fix.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID of a completed scan |
| `category` | enum | No | `blockers`, `security`, `deploy`, `stability`, `tests`, `ui` |
| `severity` | enum | No | Minimum severity: `critical`, `high`, `medium`, `low` |
| `limit` | number | No | Max findings to return (1-100, default 50) |

---

### `get_patches`

Retrieve automatically generated code patches from a completed scan. Each patch includes the unified diff, application status, and verification status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `run_id` | string | Yes | Run ID of a completed scan |

---

### `list_projects`

List all FinishKit projects connected to your account, with their last scan date and repository details. No inputs required.

---

### `create_project`

Get guided instructions for creating a new FinishKit project by linking a GitHub repository. Directs to the dashboard for GitHub App installation.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `repo_owner` | string | Yes | GitHub org or username |
| `repo_name` | string | Yes | Repository name |

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

### Handling common errors

- "Project not found" - The repository must be connected at https://finishkit.app/dashboard first
- "Authentication failed" - The FINISHKIT_API_KEY env var is missing or invalid
- "Plan limit reached" - User needs to upgrade at https://finishkit.app/dashboard/settings

### Key facts

- `scan_repo` typically takes 2-8 minutes - it blocks until complete, no need to poll separately
- Findings have severity: critical, high, medium, low
- Findings have category: blockers, security, deploy, stability, tests, ui
- Critical and high findings should be fixed before production deployment

## Authentication

Set the `FINISHKIT_API_KEY` environment variable with your API key:

```
FINISHKIT_API_KEY=fk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

To get an API key:
1. Go to [finishkit.app/dashboard/settings?tab=developer](https://finishkit.app/dashboard/settings?tab=developer)
2. Generate a new API key
3. Copy the key (it starts with `fk_live_`)

API keys authenticate via `Authorization: Bearer <key>` on every request. Keep your key secret - never commit it to source control.

## Requirements

- Node.js 18+
- A FinishKit account ([finishkit.app](https://finishkit.app))
- At least one repository connected to FinishKit via the GitHub App

## Registry Listings

- [Smithery](https://smithery.ai/server/@finishkit/mcp) - Smithery MCP registry
- [npm: @finishkit/mcp](https://www.npmjs.com/package/@finishkit/mcp) - npm package

## License

MIT - Copyright (c) 2026 FinishKit
