# Claude MCP Server

This is a simulated Claude MCP server that:
- Accepts JSON POSTs at `/mcp/claude/completion`
- Saves prompt/reply to `memory.json`
- Exposes current memory at `/mcp/claude/context`

In real usage, you can swap the simulated reply with actual API calls to Claude 3 or any LLM.
