// Claude MCP Server with Anthropic API
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
const app = express();
app.use(bodyParser.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MEMORY_PATH = path.join(__dirname, 'memory.json');

function getMemory(): any {
  if (!fs.existsSync(MEMORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf-8'));
}
function updateMemory(newMemory: any): void {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(newMemory, null, 2));
}

app.post('/mcp/claude/completion', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  const memory = getMemory();

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    memory.lastPrompt = prompt;
    memory.lastReply = completion.content?.[0]?.text || '[No response]';
    updateMemory(memory);

    res.json({ reply: memory.lastReply, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/mcp/claude/context', (req: Request, res: Response) => {
  const memory = getMemory();
  res.json({ memory });
});

const PORT = process.env.CLAUDE_MCP_PORT || 4040;
app.listen(PORT, () => {
  console.log(`[Claude MCP] Running on http://localhost:${PORT}`);
});
