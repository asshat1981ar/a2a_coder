#!/usr/bin/env ts-node
import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

import jsonRpcRouter from './router/jsonrpc';
import { metaDispatch } from './orchestration/meta-agent';
import { AgentInfo, registerAgent, getActiveAgents } from './agents/registry';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

app.use('/api', jsonRpcRouter);

app.post('/api/orchestrator/dispatch', async (req: Request, res: Response) => {
  try {
    const { prompt, modelHint } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt parameter' });
    }
    
    const result = await metaDispatch({ prompt, modelHint });
    
    res.json({
      success: true,
      result,
      model: modelHint || 'claude',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Orchestrator dispatch error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/agents', (req: Request, res: Response) => {
  res.json({
    agents: getActiveAgents(),
    total: getActiveAgents().length
  });
});

app.post('/api/agents/register', (req: Request, res: Response) => {
  try {
    const agentInfo: AgentInfo = req.body;
    
    if (!agentInfo.id || !agentInfo.name || !agentInfo.capabilities) {
      return res.status(400).json({ error: 'Missing required agent fields' });
    }
    
    registerAgent(agentInfo);
    
    res.json({
      success: true,
      message: 'Agent registered successfully',
      agent: agentInfo
    });
  } catch (error: any) {
    console.error('Agent registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const session = driver.session();
    await session.run('RETURN 1 as test');
    await session.close();
    
    res.json({
      status: 'healthy',
      services: {
        orchestrator: 'running',
        neo4j: 'connected',
        agents: getActiveAgents().length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/mcp/endpoints', (req: Request, res: Response) => {
  res.json({
    endpoints: {
      claude: 'http://localhost:4040/mcp/claude/completion',
      gpt4: 'http://localhost:8000/mcp/gpt4/completion',
      deepseek: 'http://localhost:8001/mcp/deepseek/completion'
    },
    status: 'active'
  });
});

const initializeAgents = () => {
  const defaultAgents: AgentInfo[] = [
    {
      id: 'claude-mcp',
      name: 'Claude MCP Agent',
      capabilities: ['completion', 'reasoning', 'analysis'],
      status: 'active'
    },
    {
      id: 'gpt4-mcp',
      name: 'GPT-4 MCP Agent',
      capabilities: ['completion', 'coding', 'analysis'],
      status: 'active'
    },
    {
      id: 'deepseek-mcp',
      name: 'DeepSeek MCP Agent',
      capabilities: ['completion', 'coding', 'chat'],
      status: 'active'
    }
  ];
  
  defaultAgents.forEach(agent => registerAgent(agent));
};

app.listen(PORT, () => {
  console.log(`🚀 A2A Orchestrator running on http://localhost:${PORT}`);
  console.log(`📊 Neo4j: ${process.env.NEO4J_URI || 'bolt://localhost:7687'}`);
  
  initializeAgents();
  console.log(`🤖 Initialized ${getActiveAgents().length} default agents`);

  // Load and log agent capabilities from agent_capabilities.json
  try {
    const capabilities = require('/app/agent_capabilities.json');
    console.log('Loaded agents from agent_capabilities.json:');
    capabilities.forEach((a: any) => {
      console.log(`  – ${a.id} as [${a.role}] supports ${a.supportedTasks.join(', ')}`);
    });
  } catch (error: any) {
    console.error('Error loading agent_capabilities.json:', error.message);
  }
  
  console.log('🔗 Available endpoints:');
  console.log('  - Health: /api/health');
  console.log('  - Dispatch: /api/orchestrator/dispatch');
  console.log('  - Agents: /api/agents');
  console.log('  - JSON-RPC: /api/rpc');
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down A2A Orchestrator...');
  await driver.close();
  process.exit(0);
});