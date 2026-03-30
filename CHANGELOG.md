# Changelog

All notable changes to `@finishkit/mcp` will be documented here.

## [0.3.2] - 2026-03-30

### Added
- **Zero-friction onboarding**: `finishkit_setup` now creates a browser-based activation link instead of showing JSON config walls. Users click one link, sign in, and return to their editor. No copy-paste, no manual config.
- **`npx @finishkit/mcp login`**: Browser-based auth flow (like `gh auth login`). Opens browser, user signs in, API key flows back automatically via localhost callback.
- **`npx @finishkit/mcp logout`**: Removes stored credentials.
- **Credentials file** (`~/.finishkit/credentials`): Shared credentials store read on every tool call. Eliminates the need to restart your editor after authenticating.
- **Device session polling**: MCP auto-recovers when a pending browser auth session completes. Any tool call triggers a check and picks up the new key seamlessly.
- **Auto-recovery on tool calls**: If a credentials file or device session becomes available while the server is running, the next tool call automatically connects without restart.

### Changed
- `finishkit_setup` tool description updated to reflect new setup flow.
- `noApiKeyResponse` reduced from 82 lines of JSON config to a 6-line friendly message pointing to the activation link.
- `setup` CLI now writes to `~/.finishkit/credentials` when `--api-key` is provided, and points users to `npx @finishkit/mcp login` as the primary setup path.
- API key resolution order: `FINISHKIT_API_KEY` env var > `~/.finishkit/credentials` file > setup mode.

## [0.3.1] - 2026-03-28

### Changed
- Updated tool descriptions for clarity in MCP registry listings.

## [0.3.0] - 2026-03-25

### Added
- `request_intelligence_pack` tool: request stack-specific analysis packs for local scanning.
- `sync_findings` tool: sync local analysis findings back to the FinishKit dashboard.
- Graceful degradation: server starts without an API key, `finishkit_setup` and `create_project` always work.

### Changed
- Default `baseUrl` changed from `www.finishkit.app` to `finishkit.app`.

## [0.2.1] - 2026-03-10

### Fixed
- Setup CLI editor detection on Windows.

## [0.2.0] - 2026-03-08

### Added
- `npx @finishkit/mcp setup` CLI command with auto-detection for Claude Code, Cursor, Windsurf, VS Code, and Codex.
- `finishkit_setup` tool for in-editor configuration guidance.
- Smithery registry configuration (`smithery.yaml`).

## [0.1.0] - 2026-03-04

### Added
- Initial release.
- MCP server with stdio transport.
- Tools: `scan_repo`, `get_scan_status`, `get_findings`, `get_patches`, `list_projects`, `create_project`.
- Resources: `finishkit://projects`, `finishkit://projects/{id}`, `finishkit://runs/{id}/findings`, `finishkit://runs/{id}/events`.
- Compatible with Claude Desktop, Cursor, Windsurf, VS Code Copilot Chat.
