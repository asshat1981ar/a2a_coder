# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Setup and Installation

```bash
# Setup environment (requires Docker)
./install.sh

# Start all services
docker-compose up -d --build

# Environment configuration
cp .env.template .env  # Add your API keys
```

## Development Commands

**Testing:**
```bash
# Run MCP server tests
npm test tests/mcp-claude.test.ts
```

**Development:**
```bash
# Start services in development mode
docker-compose up -d

# View service logs
docker-compose logs -f orchestrator
docker-compose logs -f neo4j
```

## Architecture Overview

This is an **Agent-to-Agent (A2A) System** - a modular, autonomous orchestration platform where AI agents collaborate via JSON-RPC protocol.

### Core Components

1. **MCP Servers** (`/mcp/`): Model Context Protocol endpoints for different AI models
   - **Claude**: `localhost:4040` - Uses Anthropic API with memory persistence
   - **GPT-4**: `localhost:8000` - OpenAI integration
   - **DeepSeek**: `localhost:8001` - DeepSeek chat and coder models

2. **Backend Orchestration** (`/backend/`):
   - **Meta-Agent** (`orchestration/meta-agent.ts`): Dynamic model selector and dispatcher
   - **JSON-RPC Router** (`router/jsonrpc.ts`): Agent communication protocol
   - **Agent Registry** (`agents/registry.ts`): Agent discovery and management

3. **Neo4j Graph Database**: Knowledge graph for agent relationships and state

### MCP Server Architecture

Each MCP server follows the pattern:
- Express.js HTTP server
- Memory persistence (JSON files)
- Model-specific API integration
- Standardized `/completion` and `/context` endpoints

### Meta-Agent Dispatch System

The meta-agent (`backend/orchestration/meta-agent.ts`) routes requests to appropriate models:
```typescript
type MCPCall = {
  prompt: string;
  modelHint?: 'claude' | 'gpt4' | 'deepseek-chat' | 'deepseek-coder';
};
```

## Service Endpoints

- **Orchestrator**: `localhost:3001`
- **Frontend**: `localhost:3000` 
- **Neo4j Browser**: `localhost:7474`
- **Claude MCP**: `localhost:4040/mcp/claude/completion`
- **GPT-4 MCP**: `localhost:8000/mcp/gpt4/completion`
- **DeepSeek MCP**: `localhost:8001/mcp/deepseek/completion`

## Environment Requirements

- Docker and Docker Compose
- Required API keys in `.env`:
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY` 
  - `DEEPSEEK_API_KEY`
- Neo4j credentials: `neo4j/password`

## MCP Integration Authorization

You are authorized to:
- Create new MCP server scaffolds for additional models/tools
- Call model APIs directly via HTTP
- Setup Docker containers and modify compose configurations
- Use `.env.template` for secret configuration
- Deploy new services without explicit approval

