# Contributing to @finishkit/mcp

## Prerequisites
- Node.js 18+
- A FinishKit API key for testing

## Local Setup

```bash
git clone https://github.com/finishkit/mcp
cd mcp
npm install
npm run build
```

## Testing Locally

Test the MCP server with Claude Desktop or any MCP-compatible client:

```json
{
  "mcpServers": {
    "finishkit": {
      "command": "node",
      "args": ["/absolute/path/to/finishkit-mcp/dist/index.js"],
      "env": { "FINISHKIT_API_KEY": "fk_live_your_key" }
    }
  }
}
```

## Code Style
- TypeScript strict mode
- All tool descriptions must be 2-3 sentences (LLMs use these to decide which tool to call)
- All input parameters must have `description` fields
- Handle all SDK error types explicitly

## Releasing

See release management documentation in the main FinishKit repository.
