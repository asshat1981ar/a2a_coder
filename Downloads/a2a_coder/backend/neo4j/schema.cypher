// Neo4j Schema for A2A Agent-to-Agent System

// Agent Constraints and Indexes
CREATE CONSTRAINT agent_id_unique IF NOT EXISTS
FOR (a:Agent) REQUIRE a.id IS UNIQUE;

CREATE INDEX agent_status_index IF NOT EXISTS
FOR (a:Agent) ON (a.status);

CREATE INDEX capability_index IF NOT EXISTS
FOR (a:Agent) ON (a.capabilities);

CREATE INDEX agent_type_index IF NOT EXISTS
FOR (a:Agent) ON (a.type);

// Task and Session Management
CREATE CONSTRAINT task_id_unique IF NOT EXISTS
FOR (t:Task) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT session_id_unique IF NOT EXISTS
FOR (s:Session) REQUIRE s.id IS UNIQUE;

CREATE INDEX task_status_index IF NOT EXISTS
FOR (t:Task) ON (t.status);

CREATE INDEX session_timestamp_index IF NOT EXISTS
FOR (s:Session) ON (s.createdAt);

// MCP Server Registry
CREATE CONSTRAINT mcp_endpoint_unique IF NOT EXISTS
FOR (m:MCPServer) REQUIRE m.endpoint IS UNIQUE;

CREATE INDEX mcp_model_index IF NOT EXISTS
FOR (m:MCPServer) ON (m.model);

// Communication and Message History
CREATE INDEX message_timestamp_index IF NOT EXISTS
FOR (msg:Message) ON (msg.timestamp);

CREATE INDEX message_type_index IF NOT EXISTS
FOR (msg:Message) ON (msg.type);

// Sample Data Structure
// Agents
CREATE (claude:Agent {
  id: 'claude-mcp',
  name: 'Claude MCP Agent',
  type: 'mcp_server',
  capabilities: ['completion', 'reasoning', 'analysis'],
  status: 'active',
  endpoint: 'http://localhost:4040/mcp/claude/completion',
  model: 'claude-3-opus-20240229',
  createdAt: datetime()
});

CREATE (gpt4:Agent {
  id: 'gpt4-mcp',
  name: 'GPT-4 MCP Agent',
  type: 'mcp_server',
  capabilities: ['completion', 'coding', 'analysis'],
  status: 'active',
  endpoint: 'http://localhost:8000/mcp/gpt4/completion',
  model: 'gpt-4',
  createdAt: datetime()
});

CREATE (deepseek:Agent {
  id: 'deepseek-mcp',
  name: 'DeepSeek MCP Agent',
  type: 'mcp_server',
  capabilities: ['completion', 'coding', 'chat'],
  status: 'active',
  endpoint: 'http://localhost:8001/mcp/deepseek/completion',
  model: 'deepseek-coder',
  createdAt: datetime()
});

CREATE (orchestrator:Agent {
  id: 'meta-orchestrator',
  name: 'Meta Orchestrator',
  type: 'orchestrator',
  capabilities: ['routing', 'coordination', 'load_balancing'],
  status: 'active',
  endpoint: 'http://localhost:3001',
  createdAt: datetime()
});

// MCP Server Registry
CREATE (claudeMCP:MCPServer {
  id: 'claude-mcp-server',
  endpoint: 'http://localhost:4040/mcp/claude/completion',
  model: 'claude-3-opus-20240229',
  provider: 'anthropic',
  status: 'active',
  capabilities: ['completion', 'context'],
  memoryPath: './mcp/claude/memory.json'
});

CREATE (gpt4MCP:MCPServer {
  id: 'gpt4-mcp-server',
  endpoint: 'http://localhost:8000/mcp/gpt4/completion',
  model: 'gpt-4',
  provider: 'openai',
  status: 'active',
  capabilities: ['completion', 'context']
});

CREATE (deepseekMCP:MCPServer {
  id: 'deepseek-mcp-server',
  endpoint: 'http://localhost:8001/mcp/deepseek/completion',
  model: 'deepseek-coder',
  provider: 'deepseek',
  status: 'active',
  capabilities: ['completion', 'context', 'chat', 'coder']
});

// Agent Relationships
CREATE (orchestrator)-[:MANAGES]->(claude);
CREATE (orchestrator)-[:MANAGES]->(gpt4);
CREATE (orchestrator)-[:MANAGES]->(deepseek);

CREATE (claude)-[:CONNECTED_TO]->(claudeMCP);
CREATE (gpt4)-[:CONNECTED_TO]->(gpt4MCP);
CREATE (deepseek)-[:CONNECTED_TO]->(deepseekMCP);
