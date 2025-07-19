import neo4j from 'neo4j-driver';

export type AgentInfo = {
  id: string;
  name: string;
  capabilities: string[];
  status: 'active' | 'offline';
  type?: string;
  endpoint?: string;
  model?: string;
  createdAt?: Date;
  lastSeen?: Date;
};

export type TaskInfo = {
  id: string;
  agentId: string;
  prompt: string;
  response?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
};

export const agentRegistry: AgentInfo[] = [];
export const taskHistory: TaskInfo[] = [];

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

export function registerAgent(agent: AgentInfo): void {
  const existingIndex = agentRegistry.findIndex(a => a.id === agent.id);
  
  const agentWithTimestamp = {
    ...agent,
    createdAt: agent.createdAt || new Date(),
    lastSeen: new Date()
  };
  
  if (existingIndex >= 0) {
    agentRegistry[existingIndex] = agentWithTimestamp;
  } else {
    agentRegistry.push(agentWithTimestamp);
  }
  
  syncAgentToNeo4j(agentWithTimestamp);
}

export function getActiveAgents(): AgentInfo[] {
  return agentRegistry.filter(agent => agent.status === 'active');
}

export function getAllAgents(): AgentInfo[] {
  return [...agentRegistry];
}

export function getAgentById(id: string): AgentInfo | undefined {
  return agentRegistry.find(agent => agent.id === id);
}

export function updateAgentStatus(id: string, status: 'active' | 'offline'): boolean {
  const agent = agentRegistry.find(a => a.id === id);
  if (agent) {
    agent.status = status;
    agent.lastSeen = new Date();
    syncAgentToNeo4j(agent);
    return true;
  }
  return false;
}

export function removeAgent(id: string): boolean {
  const index = agentRegistry.findIndex(a => a.id === id);
  if (index >= 0) {
    agentRegistry.splice(index, 1);
    removeAgentFromNeo4j(id);
    return true;
  }
  return false;
}

export function createTask(agentId: string, prompt: string): TaskInfo {
  const task: TaskInfo = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    prompt,
    status: 'pending',
    createdAt: new Date()
  };
  
  taskHistory.push(task);
  syncTaskToNeo4j(task);
  
  return task;
}

export function updateTask(taskId: string, updates: Partial<TaskInfo>): boolean {
  const task = taskHistory.find(t => t.id === taskId);
  if (task) {
    Object.assign(task, updates);
    if (updates.status === 'completed' || updates.status === 'failed') {
      task.completedAt = new Date();
    }
    syncTaskToNeo4j(task);
    return true;
  }
  return false;
}

export function getTaskHistory(agentId?: string): TaskInfo[] {
  if (agentId) {
    return taskHistory.filter(task => task.agentId === agentId);
  }
  return [...taskHistory];
}

export function getAgentStats(agentId: string) {
  const agent = getAgentById(agentId);
  const tasks = getTaskHistory(agentId);
  
  return {
    agent,
    taskStats: {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length
    },
    averageResponseTime: calculateAverageResponseTime(tasks)
  };
}

function calculateAverageResponseTime(tasks: TaskInfo[]): number {
  const completedTasks = tasks.filter(t => t.completedAt && t.status === 'completed');
  if (completedTasks.length === 0) return 0;
  
  const totalTime = completedTasks.reduce((sum, task) => {
    const duration = task.completedAt!.getTime() - task.createdAt.getTime();
    return sum + duration;
  }, 0);
  
  return totalTime / completedTasks.length;
}

async function syncAgentToNeo4j(agent: AgentInfo): Promise<void> {
  const session = driver.session();
  try {
    await session.run(
      `
      MERGE (a:Agent {id: $id})
      SET a.name = $name,
          a.capabilities = $capabilities,
          a.status = $status,
          a.type = $type,
          a.endpoint = $endpoint,
          a.model = $model,
          a.createdAt = datetime($createdAt),
          a.lastSeen = datetime($lastSeen)
      `,
      {
        id: agent.id,
        name: agent.name,
        capabilities: agent.capabilities,
        status: agent.status,
        type: agent.type || 'unknown',
        endpoint: agent.endpoint || null,
        model: agent.model || null,
        createdAt: agent.createdAt?.toISOString(),
        lastSeen: agent.lastSeen?.toISOString()
      }
    );
  } catch (error) {
    console.error('Error syncing agent to Neo4j:', error);
  } finally {
    await session.close();
  }
}

async function syncTaskToNeo4j(task: TaskInfo): Promise<void> {
  const session = driver.session();
  try {
    await session.run(
      `
      MERGE (t:Task {id: $id})
      SET t.agentId = $agentId,
          t.prompt = $prompt,
          t.response = $response,
          t.status = $status,
          t.createdAt = datetime($createdAt),
          t.completedAt = datetime($completedAt)
      WITH t
      MATCH (a:Agent {id: $agentId})
      MERGE (a)-[:EXECUTED]->(t)
      `,
      {
        id: task.id,
        agentId: task.agentId,
        prompt: task.prompt,
        response: task.response || null,
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        completedAt: task.completedAt?.toISOString() || null
      }
    );
  } catch (error) {
    console.error('Error syncing task to Neo4j:', error);
  } finally {
    await session.close();
  }
}

async function removeAgentFromNeo4j(agentId: string): Promise<void> {
  const session = driver.session();
  try {
    await session.run(
      `
      MATCH (a:Agent {id: $id})
      DETACH DELETE a
      `,
      { id: agentId }
    );
  } catch (error) {
    console.error('Error removing agent from Neo4j:', error);
  } finally {
    await session.close();
  }
}

export async function getAgentMetricsFromNeo4j() {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (a:Agent)
      OPTIONAL MATCH (a)-[:EXECUTED]->(t:Task)
      RETURN a.id as agentId, 
             a.name as agentName,
             a.status as status,
             count(t) as totalTasks,
             count(CASE WHEN t.status = 'completed' THEN 1 END) as completedTasks,
             count(CASE WHEN t.status = 'failed' THEN 1 END) as failedTasks
      ORDER BY a.name
    `);
    
    return result.records.map(record => ({
      agentId: record.get('agentId'),
      agentName: record.get('agentName'),
      status: record.get('status'),
      totalTasks: record.get('totalTasks').toNumber(),
      completedTasks: record.get('completedTasks').toNumber(),
      failedTasks: record.get('failedTasks').toNumber()
    }));
  } catch (error) {
    console.error('Error fetching agent metrics from Neo4j:', error);
    return [];
  } finally {
    await session.close();
  }
}
