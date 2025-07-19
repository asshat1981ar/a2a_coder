# A2A (Agent-to-Agent) Orchestration System

A sophisticated multi-agent system for autonomous task decomposition, intelligent routing, and collaborative AI orchestration with learning loops and self-improvement capabilities.

## 🚀 Quick Start

```bash
# Setup environment
cp .env.template .env  # Add your API keys

# Start all services
docker-compose up -d --build

# Verify system health
curl http://localhost:3001/api/health
```

## 🏗️ Architecture Overview

### Core Components

- **Orchestrator Backend** (`/backend/`) - Express.js server with intelligent task routing
- **MCP Servers** (`/mcp/`) - Model Context Protocol endpoints for Claude, GPT-4, DeepSeek
- **Neo4j Knowledge Graph** - Persistent agent relationships and performance metrics  
- **React Dashboard** (`/frontend/`) - Real-time monitoring and management interface

### Service Endpoints

- **Frontend Dashboard**: http://localhost:3000
- **Orchestrator API**: http://localhost:3001
- **Neo4j Browser**: http://localhost:7474 (neo4j/password)
- **Claude MCP**: http://localhost:4040
- **GPT-4 MCP**: http://localhost:8000  
- **DeepSeek MCP**: http://localhost:8001

## 🤖 Intelligent Agent Features

### Current Capabilities
- ✅ Multi-model integration (Claude, GPT-4, DeepSeek)
- ✅ Dynamic agent registry with capability tracking
- ✅ Performance metrics and success rate monitoring
- ✅ Neo4j graph database for relationship modeling
- ✅ JSON-RPC protocol for standardized communication
- ✅ Real-time health monitoring and error tracking
- ✅ Memory persistence per conversation context

### Advanced Features (Roadmap)
- 🔄 **Learning Loops**: Performance-based agent selection optimization
- 🧠 **Self-Improvement**: Automated strategy evolution and parameter tuning
- 📊 **Analytics Engine**: Pattern detection and quality assessment
- 🎯 **Adaptive Routing**: ML-driven task-to-agent matching
- 💾 **Vector Memory**: Semantic conversation history and context retrieval
- ⚡ **Cost Optimization**: Token usage tracking and efficiency improvements

## 🛠️ Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for MCP servers)

### Environment Variables
Required in `.env`:
```bash
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key  
DEEPSEEK_API_KEY=your_deepseek_key
NEO4J_PASSWORD=password
```

### Local Development
```bash
# Backend development
cd backend && npm install && npm run dev

# Frontend development  
cd frontend && npm install && npm run dev

# MCP server development
cd mcp/claude && npm install && npm run dev
cd mcp/deepseek && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python server.py
```

### Testing
```bash
# Run system validation
npm test tests/mcp-claude.test.ts

# Health check all services
curl http://localhost:3001/api/health
```

## 📡 API Reference

### Orchestrator Endpoints

**Task Dispatch**:
```bash
POST /api/orchestrator/dispatch
{
  "prompt": "Analyze this code for security vulnerabilities",
  "modelHint": "claude"  // optional: claude|gpt4|deepseek-chat|deepseek-coder
}
```

**Agent Management**:
```bash
GET /api/agents                    # List all agents
POST /api/agents/register          # Register new agent
GET /api/health                    # System health check
```

### JSON-RPC Methods
```bash
POST /api/rpc
{
  "jsonrpc": "2.0",
  "method": "agent.list",
  "id": 1
}
```

Available methods: `agent.ping`, `agent.list`, `agent.get`, `agent.register`, `agent.stats`, `task.create`, `task.update`, `task.history`, `mcp.dispatch`, `system.health`, `system.info`

## 🔍 Monitoring & Analytics

### Performance Metrics
- Agent response times and success rates
- Task completion statistics  
- Error patterns and retry counts
- Cost tracking per model/token usage

### Neo4j Queries
```cypher
// View agent performance
MATCH (a:Agent)-[:EXECUTES]->(t:Task)
RETURN a.name, avg(t.responseTime), count(t) as totalTasks

// Analyze failure patterns  
MATCH (t:Task {status: 'failed'})
RETURN t.errorType, count(*) as errorCount
ORDER BY errorCount DESC
```

## 🎯 Enhancement Roadmap

### Phase 1: Analytics Foundation (Q3 2025)
- [ ] Performance tracking and pattern detection
- [ ] Quality assessment metrics
- [ ] Cost optimization monitoring
- [ ] Prometheus/Grafana integration

### Phase 2: Adaptive Intelligence (Q4 2025)  
- [ ] ML-based agent selection
- [ ] Load balancing and fallback management
- [ ] Context analysis for optimal routing
- [ ] A/B testing framework

### Phase 3: Advanced Memory (Q1 2026)
- [ ] Vector embeddings for conversation history
- [ ] Semantic memory retrieval  
- [ ] Cross-agent knowledge sharing
- [ ] Automatic context summarization

### Phase 4: Self-Improvement (Q2 2026)
- [ ] Feedback loop automation
- [ ] Strategy evolution algorithms  
- [ ] Parameter optimization engines
- [ ] Continuous improvement tracking

## 🔐 Security

- API key management via environment variables
- Neo4j authentication with configurable credentials
- Docker network isolation between services
- No credential storage in version control

## 📚 Documentation

- [Architecture Deep Dive](docs/architecture.md)
- [API Documentation](docs/api.md)  
- [Development Guide](docs/development.md)
- [Deployment Guide](docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`) 
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with Claude Code assistance and powered by:
- [Anthropic Claude](https://www.anthropic.com)
- [OpenAI GPT-4](https://openai.com)  
- [DeepSeek](https://www.deepseek.com)
- [Neo4j Graph Database](https://neo4j.com)