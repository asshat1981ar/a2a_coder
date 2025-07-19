#!/usr/bin/env python3
"""
DeepSeek MCP Server for A2A System
Provides DeepSeek API integration with memory persistence
"""

import json
import os
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

MEMORY_PATH = os.path.join(os.path.dirname(__file__), 'memory.json')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
DEEPSEEK_API_BASE = os.getenv('DEEPSEEK_API_BASE', 'https://api.deepseek.com')

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

@app.route('/mcp/deepseek/completion', methods=['POST'])
def completion():
    """Handle DeepSeek completion requests"""
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        model = data.get('model', 'deepseek-coder')
        
        if not prompt:
            return jsonify({'error': 'Missing prompt parameter'}), 400
            
        if not DEEPSEEK_API_KEY:
            return jsonify({'error': 'DeepSeek API key not configured'}), 500
        
        memory = get_memory()
        
        # Make request to DeepSeek API
        headers = {
            'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model,
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 512,
            'temperature': 0.7
        }
        
        response = requests.post(
            f'{DEEPSEEK_API_BASE}/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            reply = result['choices'][0]['message']['content'] if result.get('choices') else '[No response]'
            
            # Update memory
            memory['lastPrompt'] = prompt
            memory['lastReply'] = reply
            memory['lastModel'] = model
            memory['timestamp'] = datetime.now().isoformat()
            memory['usage'] = result.get('usage', {})
            
            update_memory(memory)
            
            return jsonify({
                'reply': reply,
                'memory': memory,
                'model': model
            })
        else:
            error_msg = f"DeepSeek API error: {response.status_code} - {response.text}"
            return jsonify({'error': error_msg}), 500
            
    except requests.exceptions.RequestException as e:
        error_msg = f"Network error: {str(e)}"
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"DeepSeek MCP Error: {error_msg}")
        return jsonify({'error': error_msg}), 500

@app.route('/mcp/deepseek/context', methods=['GET'])
def context():
    """Get current memory/context"""
    memory = get_memory()
    return jsonify({'memory': memory})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'deepseek-mcp',
        'timestamp': datetime.now().isoformat(),
        'api_configured': bool(DEEPSEEK_API_KEY)
    })

@app.route('/mcp/deepseek/models', methods=['GET'])
def models():
    """List available models"""
    return jsonify({
        'models': [
            'deepseek-coder',
            'deepseek-chat'
        ],
        'default': 'deepseek-coder'
    })

if __name__ == '__main__':
    port = int(os.getenv('DEEPSEEK_MCP_PORT', 8001))
    print(f"[DeepSeek MCP] Starting server on http://localhost:{port}")
    
    if not DEEPSEEK_API_KEY:
        print("⚠️  Warning: DEEPSEEK_API_KEY not set. Server will start but API calls will fail.")
    
    app.run(host='0.0.0.0', port=port, debug=True)
