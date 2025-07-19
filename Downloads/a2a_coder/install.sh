#!/bin/bash

echo "🚀 Setting up A2A (Agent-to-Agent) System..."
echo "================================================"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and rerun this script."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is running"

# Check and handle port conflicts
echo "🔍 Checking for port conflicts..."

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use by another service"
        return 1
    fi
    return 0
}

# Check default ports and suggest alternatives if needed
CONFLICTS=false

if ! check_port 3000 "Frontend"; then
    echo "   Suggestion: Set FRONTEND_PORT=3002 in .env"
    CONFLICTS=true
fi

if ! check_port 3001 "Orchestrator"; then
    echo "   Suggestion: Set ORCHESTRATOR_PORT=3003 in .env"
    CONFLICTS=true
fi

if ! check_port 7474 "Neo4j HTTP" || ! check_port 7687 "Neo4j Bolt"; then
    echo "   Neo4j ports conflict - using alternatives 7475/7688"
fi

if ! check_port 4040 "Claude MCP"; then
    echo "   Suggestion: Set CLAUDE_MCP_PORT=4041 in .env"
    CONFLICTS=true
fi

if ! check_port 8000 "GPT4 MCP"; then
    echo "   Suggestion: Set GPT4_MCP_PORT=8002 in .env"
    CONFLICTS=true
fi

if ! check_port 8001 "DeepSeek MCP"; then
    echo "   Suggestion: Set DEEPSEEK_MCP_PORT=8003 in .env"
    CONFLICTS=true
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.template" ]; then
        echo "📋 Creating .env file from template..."
        cp .env.template .env
        echo "🔐 Please edit .env file and add your API keys:"
        echo "   - ANTHROPIC_API_KEY (for Claude)"
        echo "   - OPENAI_API_KEY (for GPT-4)"
        echo "   - DEEPSEEK_API_KEY (for DeepSeek)"
        if [ "$CONFLICTS" = true ]; then
            echo ""
            echo "⚠️  Also update port configurations to resolve conflicts above"
        fi
        echo ""
        echo "⚠️  Press any key to continue after updating .env..."
        read -n 1 -s
    else
        echo "❌ .env.template file not found. Creating minimal .env..."
        cat > .env << EOF
# A2A System Environment Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com

# Service Ports (customize if defaults conflict)
ORCHESTRATOR_PORT=3001
FRONTEND_PORT=3000
NEO4J_HTTP_PORT=7475
NEO4J_BOLT_PORT=7688
CLAUDE_MCP_PORT=4040
GPT4_MCP_PORT=8000
DEEPSEEK_MCP_PORT=8001

# Neo4j Configuration
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Application Environment
NODE_ENV=development
PORT=3001
EOF
        echo "📝 Created .env file. Please edit it and add your API keys."
        if [ "$CONFLICTS" = true ]; then
            echo "⚠️  Also update port configurations to resolve conflicts"
        fi
        exit 1
    fi
fi

echo "✅ Environment configuration ready"

# Stop any existing containers
echo "🛑 Stopping any existing A2A containers..."
docker-compose down > /dev/null 2>&1

# Build and start all services
echo "🔧 Building and starting A2A services..."
echo "   This may take a few minutes on first run..."

if docker-compose up -d --build; then
    echo "✅ Services started successfully!"
else
    echo "❌ Failed to start services. Check Docker logs for details."
    exit 1
fi

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Load port configurations
source .env 2>/dev/null || true

NEO4J_HTTP_PORT=${NEO4J_HTTP_PORT:-7475}
ORCHESTRATOR_PORT=${ORCHESTRATOR_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
CLAUDE_MCP_PORT=${CLAUDE_MCP_PORT:-4040}
GPT4_MCP_PORT=${GPT4_MCP_PORT:-8000}
DEEPSEEK_MCP_PORT=${DEEPSEEK_MCP_PORT:-8001}

# Check Neo4j
echo -n "   Neo4j: "
if curl -f http://localhost:${NEO4J_HTTP_PORT} > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting (may take additional time)"
fi

# Check Orchestrator
echo -n "   Orchestrator: "
if curl -f http://localhost:${ORCHESTRATOR_PORT}/api/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting"
fi

# Check Frontend
echo -n "   Frontend: "
if curl -f http://localhost:${FRONTEND_PORT} > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting"
fi

# Check MCP servers
echo -n "   Claude MCP: "
if curl -f http://localhost:${CLAUDE_MCP_PORT}/mcp/claude/context > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting"
fi

echo -n "   GPT-4 MCP: "
if curl -f http://localhost:${GPT4_MCP_PORT}/mcp/gpt4/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting"
fi

echo -n "   DeepSeek MCP: "
if curl -f http://localhost:${DEEPSEEK_MCP_PORT}/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⚠️  Starting"
fi

echo ""
echo "🎉 A2A System Setup Complete!"
echo "================================================"
echo "📊 Neo4j Browser:    http://localhost:${NEO4J_HTTP_PORT}"
echo "   Username: neo4j, Password: password"
echo ""
echo "🤖 A2A Dashboard:    http://localhost:${FRONTEND_PORT}"
echo "🔧 Orchestrator API: http://localhost:${ORCHESTRATOR_PORT}"
echo ""
echo "📡 MCP Servers:"
echo "   - Claude:     http://localhost:${CLAUDE_MCP_PORT}/mcp/claude/completion"
echo "   - GPT-4:      http://localhost:${GPT4_MCP_PORT}/mcp/gpt4/completion"
echo "   - DeepSeek:   http://localhost:${DEEPSEEK_MCP_PORT}/mcp/deepseek/completion"
echo ""
echo "🚀 JSON-RPC API:     http://localhost:${ORCHESTRATOR_PORT}/api/rpc"
echo "📖 Available methods: http://localhost:${ORCHESTRATOR_PORT}/api/rpc/methods"
echo ""
echo "🐳 Docker Commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop system:  docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
echo "✨ Your A2A system is ready for agent orchestration!"

# Initialize Neo4j schema
echo "🗄️  Initializing Neo4j schema..."
sleep 5
if docker-compose exec -T neo4j cypher-shell -u neo4j -p password -f /var/lib/neo4j/import/schema.cypher > /dev/null 2>&1; then
    echo "✅ Neo4j schema initialized"
else
    echo "⚠️  Schema initialization skipped (may need manual setup)"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Visit http://localhost:${FRONTEND_PORT} to access the dashboard"
echo "   2. Test agent dispatch with different models"
echo "   3. View agent metrics and task history"
echo "   4. Explore the Neo4j graph at http://localhost:${NEO4J_HTTP_PORT}"
echo ""
echo "💡 If you encounter port conflicts, edit .env and restart:"
echo "   docker-compose down && ./install.sh"
