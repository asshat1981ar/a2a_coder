#!/usr/bin/env python3
"""
GPT-4 MCP Server for A2A System
Provides OpenAI GPT-4 integration with memory persistence
"""

import json
import os
from datetime import datetime
from flask import Flask, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

MEMORY_PATH = os.path.join(os.path.dirname(__file__), 'memory.json')

def get_memory():
    """Load memory from JSON file"""
    if not os.path.exists(MEMORY_PATH):
        return {}
    
    try:
        with open(MEMORY_PATH, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def update_memory(new_memory):
    """Save memory to JSON file"""
    try:
        with open(MEMORY_PATH, 'w') as f:
            json.dump(new_memory, f, indent=2, default=str)
    except Exception as e:
        print(f"Error updating memory: {e}")

@app.route('/mcp/gpt4/completion', methods=['POST'])
def completion():
    """Handle GPT-4 completion requests"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        model = data.get('model', 'gpt-4')
        
        if not prompt:
            return jsonify({'error': 'Missing prompt parameter'}), 400
        
        memory = get_memory()
        
        # Create completion using OpenAI API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=512,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content if response.choices else '[No response]'
        
        # Update memory
        memory['lastPrompt'] = prompt
        memory['lastReply'] = reply
        memory['lastModel'] = model
        memory['timestamp'] = datetime.now().isoformat()
        memory['usage'] = {
            'promptTokens': response.usage.prompt_tokens if response.usage else 0,
            'completionTokens': response.usage.completion_tokens if response.usage else 0,
            'totalTokens': response.usage.total_tokens if response.usage else 0
        }
        
        update_memory(memory)
        
        return jsonify({
            'reply': reply,
            'memory': memory,
            'model': model
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"GPT-4 MCP Error: {error_msg}")
        return jsonify({'error': error_msg}), 500

@app.route('/mcp/gpt4/context', methods=['GET'])
def context():
    """Get current memory/context"""
    memory = get_memory()
    return jsonify({'memory': memory})

@app.route('/mcp/gpt4/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'gpt4-mcp',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/mcp/gpt4/models', methods=['GET'])
def models():
    """List available models"""
    return jsonify({
        'models': [
            'gpt-4',
            'gpt-4-turbo-preview',
            'gpt-3.5-turbo'
        ],
        'default': 'gpt-4'
    })

if __name__ == '__main__':
    port = int(os.getenv('GPT4_MCP_PORT', 8000))
    print(f"[GPT-4 MCP] Starting server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
