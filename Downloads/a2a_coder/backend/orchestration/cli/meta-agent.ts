// MCP Meta-Agent: Dynamic model selector and dispatcher
import axios from 'axios';

type MCPCall = {
  prompt: string;
  modelHint?: 'claude' | 'gpt4' | 'deepseek-chat' | 'deepseek-coder';
};

const MCP_ENDPOINTS = {
  claude: 'http://localhost:4040/mcp/claude/completion',
  gpt4: 'http://localhost:8000/mcp/gpt4/completion',
  deepseekChat: 'http://localhost:8001/mcp/deepseek/completion',
  deepseekCoder: 'http://localhost:8001/mcp/deepseek/completion',
};

export async function metaDispatch({ prompt, modelHint }: MCPCall): Promise<string> {
  let endpoint = MCP_ENDPOINTS.claude; // default
  let model = undefined;

  if (modelHint === 'gpt4') {
    endpoint = MCP_ENDPOINTS.gpt4;
  } else if (modelHint === 'deepseek-chat') {
    endpoint = MCP_ENDPOINTS.deepseekChat;
    model = 'deepseek-chat';
  } else if (modelHint === 'deepseek-coder') {
    endpoint = MCP_ENDPOINTS.deepseekCoder;
    model = 'deepseek-coder';
  }

  const body = model ? { prompt, model } : { prompt };

  try {
    const res = await axios.post(endpoint, body);
    return res.data.reply;
  } catch (err: any) {
    return `[ERROR calling ${modelHint || 'claude'}]: ${err.message}`;
  }
}
