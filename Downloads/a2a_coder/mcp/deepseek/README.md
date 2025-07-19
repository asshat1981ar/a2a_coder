# DeepSeek MCP Server

Supports:
- `deepseek-chat` (R model)
- `deepseek-coder` (Coder model)

Environment variables:
- `DEEPSEEK_API_KEY` - your API key
- `DEEPSEEK_API_BASE` - API endpoint (default: https://api.deepseek.com)

POST /mcp/deepseek/completion
{
  "prompt": "Write a Python function.",
  "model": "deepseek-coder"
}

GET /mcp/deepseek/context
