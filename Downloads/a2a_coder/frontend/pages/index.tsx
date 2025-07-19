import { useState, useEffect } from 'react';
import axios from 'axios';

interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'active' | 'offline';
}

interface HealthStatus {
  status: string;
  services: {
    orchestrator: string;
    neo4j: string;
    agents: number;
  };
  timestamp: string;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('claude');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAgents();
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data.agents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await axios.get('/api/health');
      setHealth(res.data);
      setError('');
    } catch (err) {
      setError('Unable to connect to orchestrator');
      console.error('Health check failed:', err);
    }
  };

  const handleDispatch = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await axios.post('/api/orchestrator/dispatch', {
        prompt,
        modelHint: selectedModel
      });

      setResponse(res.data.result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Dispatch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <h1>🤖 A2A System Dashboard</h1>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div className="grid">
          <div className="card">
            <h2>System Health</h2>
            {health ? (
              <div>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status ${health.status === 'healthy' ? 'active' : 'offline'}`}>
                    {health.status}
                  </span>
                </p>
                <p><strong>Orchestrator:</strong> {health.services.orchestrator}</p>
                <p><strong>Neo4j:</strong> {health.services.neo4j}</p>
                <p><strong>Active Agents:</strong> {health.services.agents}</p>
                <p><strong>Last Updated:</strong> {new Date(health.timestamp).toLocaleString()}</p>
              </div>
            ) : (
              <div className="loading">Loading health status...</div>
            )}
          </div>

          <div className="card">
            <h2>Active Agents</h2>
            {agents.length > 0 ? (
              <div>
                {agents.map((agent) => (
                  <div key={agent.id} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '4px' }}>
                    <div><strong>{agent.name}</strong></div>
                    <div>ID: {agent.id}</div>
                    <div>
                      Status: <span className={`status ${agent.status}`}>{agent.status}</span>
                    </div>
                    <div>Capabilities: {agent.capabilities.join(', ')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading">No agents registered</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Agent Dispatch</h2>
          <div>
            <label htmlFor="model-select"><strong>Select Model:</strong></label>
            <select 
              id="model-select"
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                fontSize: '16px',
                marginBottom: '16px'
              }}
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="gpt4">GPT-4 (OpenAI)</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="deepseek-coder">DeepSeek Coder</option>
            </select>

            <label htmlFor="prompt-input"><strong>Prompt:</strong></label>
            <textarea
              id="prompt-input"
              className="textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              disabled={loading}
            />

            <button 
              className="button" 
              onClick={handleDispatch} 
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Processing...' : 'Send to Agent'}
            </button>

            {response && (
              <div style={{ marginTop: '16px' }}>
                <label><strong>Response:</strong></label>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '16px', 
                  borderRadius: '4px', 
                  marginTop: '8px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}>
                  {response}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}