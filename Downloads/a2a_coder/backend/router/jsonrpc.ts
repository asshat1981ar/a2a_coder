import express, { Request, Response } from 'express';
import { metaDispatch } from '../orchestration/meta-agent';
import { 
  getActiveAgents, 
  getAllAgents, 
  getAgentById, 
  registerAgent, 
  updateAgentStatus,
  createTask,
  updateTask,
  getTaskHistory,
  getAgentStats,
  getAgentMetricsFromNeo4j,
  AgentInfo,
  TaskInfo
} from '../agents/registry';

const router = express.Router();

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};

router.post('/rpc', async (req: Request, res: Response) => {
  try {
    const request: JsonRpcRequest = req.body;
    
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      return res.json(createErrorResponse(request.id, JsonRpcErrorCodes.INVALID_REQUEST, 'Invalid JSON-RPC version'));
    }

    if (!request.method) {
      return res.json(createErrorResponse(request.id, JsonRpcErrorCodes.INVALID_REQUEST, 'Missing method'));
    }

    const result = await handleMethod(request.method, request.params);
    res.json(createSuccessResponse(request.id, result));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.json(createErrorResponse(req.body?.id, JsonRpcErrorCodes.INTERNAL_ERROR, errorMessage));
  }
});

async function handleMethod(method: string, params: any): Promise<any> {
  switch (method) {
    case 'agent.ping':
      return {
        message: 'pong',
        timestamp: new Date().toISOString(),
        orchestrator: 'a2a-system'
      };

    case 'agent.list':
      return {
        agents: params?.includeOffline ? getAllAgents() : getActiveAgents(),
        total: getAllAgents().length,
        active: getActiveAgents().length
      };

    case 'agent.get':
      if (!params?.id) {
        throw new Error('Agent ID required');
      }
      const agent = getAgentById(params.id);
      if (!agent) {
        throw new Error('Agent not found');
      }
      return agent;

    case 'agent.register':
      if (!params?.agent) {
        throw new Error('Agent data required');
      }
      validateAgentData(params.agent);
      registerAgent(params.agent);
      return { 
        success: true, 
        message: 'Agent registered successfully',
        agent: params.agent
      };

    case 'agent.updateStatus':
      if (!params?.id || !params?.status) {
        throw new Error('Agent ID and status required');
      }
      const updated = updateAgentStatus(params.id, params.status);
      if (!updated) {
        throw new Error('Agent not found');
      }
      return { 
        success: true, 
        message: 'Agent status updated'
      };

    case 'agent.stats':
      if (!params?.id) {
        throw new Error('Agent ID required');
      }
      return getAgentStats(params.id);

    case 'agent.metrics':
      return await getAgentMetricsFromNeo4j();

    case 'task.create':
      if (!params?.agentId || !params?.prompt) {
        throw new Error('Agent ID and prompt required');
      }
      const task = createTask(params.agentId, params.prompt);
      return task;

    case 'task.update':
      if (!params?.taskId || !params?.updates) {
        throw new Error('Task ID and updates required');
      }
      const taskUpdated = updateTask(params.taskId, params.updates);
      if (!taskUpdated) {
        throw new Error('Task not found');
      }
      return { 
        success: true, 
        message: 'Task updated successfully'
      };

    case 'task.history':
      return {
        tasks: getTaskHistory(params?.agentId),
        total: getTaskHistory(params?.agentId).length
      };

    case 'mcp.dispatch':
      if (!params?.prompt) {
        throw new Error('Prompt required');
      }
      const mcpResult = await metaDispatch({
        prompt: params.prompt,
        modelHint: params.modelHint
      });
      return {
        result: mcpResult,
        model: params.modelHint || 'claude',
        timestamp: new Date().toISOString()
      };

    case 'system.health':
      const agents = getActiveAgents();
      return {
        status: 'healthy',
        services: {
          orchestrator: 'running',
          jsonrpc: 'active',
          agents: agents.length
        },
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status
        })),
        timestamp: new Date().toISOString()
      };

    case 'system.info':
      return {
        version: '1.0.0',
        name: 'A2A Orchestration System',
        capabilities: [
          'agent-management',
          'task-orchestration',
          'mcp-integration',
          'neo4j-persistence'
        ],
        endpoints: {
          claude: 'http://localhost:4040/mcp/claude/completion',
          gpt4: 'http://localhost:8000/mcp/gpt4/completion',
          deepseek: 'http://localhost:8001/mcp/deepseek/completion'
        }
      };

    default:
      throw new Error(`Method '${method}' not found`);
  }
}

function validateAgentData(agent: AgentInfo): void {
  if (!agent.id || typeof agent.id !== 'string') {
    throw new Error('Agent ID must be a non-empty string');
  }
  if (!agent.name || typeof agent.name !== 'string') {
    throw new Error('Agent name must be a non-empty string');
  }
  if (!Array.isArray(agent.capabilities)) {
    throw new Error('Agent capabilities must be an array');
  }
  if (!['active', 'offline'].includes(agent.status)) {
    throw new Error('Agent status must be either "active" or "offline"');
  }
}

function createSuccessResponse(id: string | number | undefined, result: any): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

function createErrorResponse(id: string | number | undefined, code: number, message: string, data?: any): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  };
}

router.get('/rpc/methods', (req: Request, res: Response) => {
  res.json({
    methods: [
      {
        name: 'agent.ping',
        description: 'Health check for the orchestrator',
        params: null
      },
      {
        name: 'agent.list',
        description: 'List all registered agents',
        params: { includeOffline: 'boolean' }
      },
      {
        name: 'agent.get',
        description: 'Get specific agent by ID',
        params: { id: 'string' }
      },
      {
        name: 'agent.register',
        description: 'Register a new agent',
        params: { agent: 'AgentInfo' }
      },
      {
        name: 'agent.updateStatus',
        description: 'Update agent status',
        params: { id: 'string', status: 'active|offline' }
      },
      {
        name: 'agent.stats',
        description: 'Get agent statistics',
        params: { id: 'string' }
      },
      {
        name: 'agent.metrics',
        description: 'Get all agent metrics from Neo4j',
        params: null
      },
      {
        name: 'task.create',
        description: 'Create a new task',
        params: { agentId: 'string', prompt: 'string' }
      },
      {
        name: 'task.update',
        description: 'Update task status/response',
        params: { taskId: 'string', updates: 'Partial<TaskInfo>' }
      },
      {
        name: 'task.history',
        description: 'Get task history',
        params: { agentId: 'string' }
      },
      {
        name: 'mcp.dispatch',
        description: 'Dispatch prompt to MCP servers',
        params: { prompt: 'string', modelHint: 'string' }
      },
      {
        name: 'system.health',
        description: 'Get system health status',
        params: null
      },
      {
        name: 'system.info',
        description: 'Get system information',
        params: null
      }
    ]
  });
});

export default router;
