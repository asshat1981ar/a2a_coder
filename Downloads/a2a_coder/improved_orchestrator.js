#!/usr/bin/env node
/**
 * Improved D&D MMORPG Orchestrator with Performance Optimizations
 * Features: Caching, Weighted Voting, Task Specialization, Error Handling
 */

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

class ImprovedOrchestrator {
  constructor() {
    this.agents = {
      claude: { 
        endpoint: 'http://localhost:4040/mcp/claude/completion',
        specialties: ['creative-writing', 'dialogue', 'storytelling'],
        weight: 1.2
      },
      gpt4: { 
        endpoint: 'http://localhost:8000/mcp/gpt4/completion',
        specialties: ['architecture', 'planning', 'analysis'],
        weight: 1.1
      },
      deepseek: { 
        endpoint: 'http://localhost:8001/mcp/deepseek/completion',
        specialties: ['coding', 'technical', 'implementation'],
        weight: 1.0,
        model: 'deepseek-coder'
      }
    };
    
    this.cache = new Map();
    this.metrics = {
      responseTime: {},
      accuracy: {},
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    };
    
    this.loadCache();
  }

  // Caching system
  getCacheKey(prompt, agent) {
    return crypto.createHash('md5').update(`${agent}:${prompt}`).digest('hex');
  }

  loadCache() {
    try {
      if (fs.existsSync('./orchestrator_cache.json')) {
        const cacheData = JSON.parse(fs.readFileSync('./orchestrator_cache.json', 'utf8'));
        this.cache = new Map(cacheData);
        console.log(`💾 Loaded ${this.cache.size} cached responses`);
      }
    } catch (error) {
      console.log('⚠️  Cache load failed, starting fresh');
    }
  }

  saveCache() {
    try {
      const cacheArray = Array.from(this.cache.entries());
      fs.writeFileSync('./orchestrator_cache.json', JSON.stringify(cacheArray, null, 2));
    } catch (error) {
      console.error('❌ Cache save failed:', error.message);
    }
  }

  // Improved HTTP request with retry logic
  async makeHttpRequest(url, data, retries = 0) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', (error) => {
        if (retries < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, retries),
            this.retryConfig.maxDelay
          );
          console.log(`🔄 Retrying in ${delay}ms (attempt ${retries + 1}/${this.retryConfig.maxRetries})`);
          setTimeout(() => {
            this.makeHttpRequest(url, data, retries + 1).then(resolve).catch(reject);
          }, delay);
        } else {
          reject(error);
        }
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  // Task specialization - route tasks to best agents
  selectAgentsForTask(taskType, taskDescription) {
    const selectedAgents = [];
    
    // Analyze task to determine best agents
    const taskLower = taskDescription.toLowerCase();
    
    // Always include DeepSeek for technical tasks
    if (taskLower.includes('code') || taskLower.includes('implement') || taskLower.includes('technical')) {
      selectedAgents.push('deepseek');
    }
    
    // Include Claude for creative/dialogue tasks
    if (taskLower.includes('npc') || taskLower.includes('dialogue') || taskLower.includes('story')) {
      selectedAgents.push('claude');
    }
    
    // Include GPT4 for architecture/planning
    if (taskLower.includes('architecture') || taskLower.includes('plan') || taskLower.includes('design')) {
      selectedAgents.push('gpt4');
    }
    
    // Default: use all agents if no specialization detected
    if (selectedAgents.length === 0) {
      selectedAgents.push('claude', 'gpt4', 'deepseek');
    }
    
    // Ensure at least 2 agents for voting
    if (selectedAgents.length === 1) {
      const otherAgents = Object.keys(this.agents).filter(a => !selectedAgents.includes(a));
      if (otherAgents.length > 0) {
        selectedAgents.push(otherAgents[0]);
      }
    }
    
    console.log(`🎯 Selected agents for "${taskType}": ${selectedAgents.join(', ')}`);
    return selectedAgents;
  }

  async queryAgentWithCache(agent, prompt) {
    const cacheKey = this.getCacheKey(prompt, agent);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      const cached = this.cache.get(cacheKey);
      console.log(`💾 Cache hit for ${agent} (${cached.responseTime}ms original)`);
      return {
        ...cached,
        cached: true,
        responseTime: 50 // Simulate fast cache response
      };
    }
    
    this.metrics.cacheMisses++;
    const startTime = Date.now();
    
    try {
      const agentConfig = this.agents[agent];
      const payload = agentConfig.model ? { prompt, model: agentConfig.model } : { prompt };
      const response = await this.makeHttpRequest(agentConfig.endpoint, payload);
      
      const responseTime = Date.now() - startTime;
      const success = !response.error;
      
      const result = {
        agent,
        success,
        response: response.reply || response.error,
        responseTime,
        timestamp: new Date().toISOString(),
        cached: false
      };
      
      // Cache successful responses
      if (success) {
        this.cache.set(cacheKey, result);
        this.saveCache();
      }
      
      this.updateMetrics(agent, responseTime, success);
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Agent ${agent} failed after retries:`, error.message);
      
      return {
        agent,
        success: false,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString(),
        cached: false
      };
    }
  }

  updateMetrics(agent, responseTime, success) {
    if (!this.metrics.responseTime[agent]) {
      this.metrics.responseTime[agent] = [];
    }
    if (!this.metrics.accuracy[agent]) {
      this.metrics.accuracy[agent] = [];
    }
    
    this.metrics.responseTime[agent].push(responseTime);
    this.metrics.accuracy[agent].push(success ? 1 : 0);
    
    // Keep only last 10 metrics
    if (this.metrics.responseTime[agent].length > 10) {
      this.metrics.responseTime[agent].shift();
      this.metrics.accuracy[agent].shift();
    }
  }

  // Improved weighted voting algorithm
  calculateWeightedVotes(responses, taskType) {
    const scores = responses.map((response, index) => {
      if (!response.success) return { agent: response.agent, score: 0, breakdown: 'Failed response' };
      
      let score = 10; // Base score
      const agentConfig = this.agents[response.agent];
      
      // Apply agent weight
      score *= agentConfig.weight;
      
      // Specialization bonus
      const taskLower = taskType.toLowerCase();
      const hasSpecialty = agentConfig.specialties.some(specialty => 
        taskLower.includes(specialty.split('-')[0])
      );
      if (hasSpecialty) {
        score *= 1.3; // 30% bonus for specialization
      }
      
      // Response time penalty (logarithmic to avoid over-penalizing)
      const timePenalty = Math.log(response.responseTime / 1000 + 1) * 0.5;
      score -= timePenalty;
      
      // Cache bonus (faster responses preferred)
      if (response.cached) {
        score += 2;
      }
      
      // Response length consideration (reasonable length preferred)
      const responseLength = response.response ? response.response.length : 0;
      if (responseLength > 100 && responseLength < 2000) {
        score += 1; // Bonus for good response length
      }
      
      return {
        agent: response.agent,
        score: Math.max(0, score),
        breakdown: `Base(10) × Weight(${agentConfig.weight}) ${hasSpecialty ? '× Specialty(1.3)' : ''} - Time(${timePenalty.toFixed(1)}) ${response.cached ? '+ Cache(2)' : ''}`
      };
    });
    
    return scores.sort((a, b) => b.score - a.score);
  }

  async executeImprovedTask(taskType, taskDescription) {
    console.log(`\\n🚀 Executing: ${taskType}`);
    console.log(`📝 Description: ${taskDescription}`);
    
    // Select specialized agents
    const selectedAgents = this.selectAgentsForTask(taskType, taskDescription);
    
    const prompt = `
Task: ${taskType}
Description: ${taskDescription}

Context: D&D-inspired MMORPG for Android with AI-powered NPCs and dynamic world.

Provide a detailed implementation approach focusing on your expertise. Include:
1. Technical approach
2. Key considerations
3. Implementation steps
4. Integration points

Keep response concise but comprehensive.
    `;

    console.log(`🤖 Querying ${selectedAgents.length} specialized agents...`);
    
    // Query selected agents with caching
    const responses = await Promise.all(
      selectedAgents.map(agent => this.queryAgentWithCache(agent, prompt))
    );

    // Weighted voting
    const votingResults = this.calculateWeightedVotes(responses, taskType);
    const winner = votingResults[0];
    
    console.log('\\n🗳️  Weighted Voting Results:');
    votingResults.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`${medal} ${result.agent}: ${result.score.toFixed(2)} points`);
      console.log(`   ${result.breakdown}`);
    });
    
    return {
      taskType,
      responses,
      votingResults,
      winner: responses.find(r => r.agent === winner.agent),
      cacheStats: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        ratio: (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(1)
      }
    };
  }

  displayImprovedMetrics() {
    console.log('\\n📊 Enhanced Performance Metrics');
    console.log('=' .repeat(50));
    
    // Cache performance
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheRatio = totalRequests > 0 ? (this.metrics.cacheHits / totalRequests * 100).toFixed(1) : 0;
    console.log(`💾 Cache Performance:`);
    console.log(`   Hits: ${this.metrics.cacheHits} | Misses: ${this.metrics.cacheMisses}`);
    console.log(`   Hit Ratio: ${cacheRatio}% | Total Cached: ${this.cache.size}`);
    
    // Agent performance
    for (const [agent, config] of Object.entries(this.agents)) {
      const responseTimes = this.metrics.responseTime[agent] || [];
      const accuracy = this.metrics.accuracy[agent] || [];
      
      if (responseTimes.length === 0) continue;
      
      const avgTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
      const successRate = ((accuracy.reduce((a, b) => a + b, 0) / accuracy.length) * 100).toFixed(0);
      
      console.log(`\\n${agent.toUpperCase()}:`);
      console.log(`   Specialties: ${config.specialties.join(', ')}`);
      console.log(`   Weight: ${config.weight}x`);
      console.log(`   Avg Response: ${avgTime}ms`);
      console.log(`   Success Rate: ${successRate}%`);
    }
  }

  async runImprovedDemo() {
    console.log('🚀 IMPROVED D&D MMORPG A2A Orchestrator');
    console.log('✨ Features: Caching, Weighted Voting, Specialization, Retry Logic');
    console.log('=' .repeat(70));
    
    const tasks = [
      {
        type: 'NPC Dialogue System',
        description: 'Design an AI-powered NPC dialogue system with personality traits and memory'
      },
      {
        type: 'Combat Mechanics',
        description: 'Implement turn-based combat system with spell casting and damage calculation'
      },
      {
        type: 'World Architecture',
        description: 'Design scalable architecture for dynamic world events and player interactions'
      }
    ];
    
    const results = [];
    
    for (const task of tasks) {
      const result = await this.executeImprovedTask(task.type, task.description);
      results.push(result);
      
      // Display winner response preview
      if (result.winner && result.winner.success) {
        console.log(`\\n🏆 Winner Response Preview:`);
        console.log(`${result.winner.response.substring(0, 300)}...`);
      }
      
      console.log('\\n' + '='.repeat(50));
    }
    
    // Final metrics
    this.displayImprovedMetrics();
    
    // Generate improvement report
    console.log('\\n💡 System Improvements Implemented:');
    console.log('✅ Response caching (reduces redundant API calls)');
    console.log('✅ Weighted voting (considers agent specialization)');
    console.log('✅ Task specialization routing');
    console.log('✅ Retry logic with exponential backoff');
    console.log('✅ Enhanced error handling');
    
    return results;
  }
}

// Run the improved orchestrator
if (require.main === module) {
  const orchestrator = new ImprovedOrchestrator();
  orchestrator.runImprovedDemo().catch(console.error);
}

module.exports = ImprovedOrchestrator;