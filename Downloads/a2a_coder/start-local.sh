#!/bin/bash

echo "🚀 Starting A2A System Locally (bypassing Docker build issues)..."
echo "================================================"

# Check if required ports are available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is in use"
        return 1
    fi
    return 0
}

# Start Neo4j with Docker (this works)
echo "📊 Starting Neo4j database..."
docker run -d --name a2a-neo4j \
  -p 7476:7474 -p 7689:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
  neo4j:5

# Start DeepSeek MCP
echo "🤖 Starting DeepSeek MCP server..."
cd mcp/deepseek
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
pip install flask requests python-dotenv 2>/dev/null || true
DEEPSEEK_MCP_PORT=8001 python server.py &
DEEPSEEK_PID=$!
cd ../..

# Start GPT-4 MCP  
echo "🧠 Starting GPT-4 MCP server..."
cd mcp/gpt4
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true
pip install flask requests python-dotenv openai 2>/dev/null || true
GPT4_MCP_PORT=8000 python server.py &
GPT4_PID=$!
cd ../..

echo "⏳ Waiting for services to initialize..."
sleep 10

# Test services
echo "🔍 Testing service availability..."

if curl -f http://localhost:7476 >/dev/null 2>&1; then
    echo "✅ Neo4j running on http://localhost:7476"
else
    echo "❌ Neo4j not responding"
fi

if curl -f http://localhost:8001/health >/dev/null 2>&1; then
    echo "✅ DeepSeek MCP running on http://localhost:8001"
else
    echo "❌ DeepSeek MCP not responding"
fi

if curl -f http://localhost:8000/mcp/gpt4/health >/dev/null 2>&1; then
    echo "✅ GPT-4 MCP running on http://localhost:8000"
else
    echo "❌ GPT-4 MCP not responding"
fi

echo ""
echo "🎉 A2A Core Services Started!"
echo "================================================"
echo "📊 Neo4j Browser:    http://localhost:7476"
echo "   Username: neo4j, Password: password"
echo ""
echo "📡 MCP Servers:"
echo "   - GPT-4:      http://localhost:8000/mcp/gpt4/health"
echo "   - DeepSeek:   http://localhost:8001/health"
echo ""
echo "💡 Note: Node.js services (orchestrator, frontend, Claude MCP) skipped due to npm timeout issues"
echo "🔧 You can manually start them once npm connectivity improves"
echo ""
echo "🛑 To stop services, run: ./stop-local.sh"

# Create stop script
cat > stop-local.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping A2A local services..."
docker stop a2a-neo4j 2>/dev/null || true
docker rm a2a-neo4j 2>/dev/null || true
pkill -f "python.*server.py" 2>/dev/null || true
echo "✅ Services stopped"
EOF

chmod +x stop-local.sh

echo ""
echo "📋 Process IDs: DeepSeek=$DEEPSEEK_PID, GPT4=$GPT4_PID"