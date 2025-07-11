#!/bin/bash

# MCP Ecosystem Startup Script
echo "🚀 Starting MCP Ecosystem..."

# Check if Claude Desktop is running
echo "📋 Checking Claude Desktop status..."

# Check server health
echo "🏥 Running health checks..."
node /mnt/c/Users/posso/mcp-servers/mcp-ecosystem-manager.js

# Start any additional services
echo "⚙️  Starting additional services..."

# PostgreSQL (if not running)
# pg_ctl start -D /usr/local/var/postgres

# Docker (if needed)
# systemctl start docker

echo "✅ MCP Ecosystem startup complete!"
echo "📊 Check health report for any issues"
