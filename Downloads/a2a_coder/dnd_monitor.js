#!/usr/bin/env node
/**
 * D&D MMORPG Real-time Monitoring Dashboard
 * Monitors A2A agent performance and voting outcomes
 */

const http = require('http');
const fs = require('fs');

class DnDMonitor {
  constructor() {
    this.agents = ['claude', 'gpt4', 'deepseek'];
    this.metrics = {
      responseTime: {},
      accuracy: {},
      votingHistory: []
    };
    this.MCP_ENDPOINTS = {
      claude: 'http://localhost:4040/mcp/claude/completion',
      gpt4: 'http://localhost:8000/mcp/gpt4/completion', 
      deepseek: 'http://localhost:8001/mcp/deepseek/completion'
    };
  }

  async makeHttpRequest(url, data) {
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

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  async testAgent(agent, prompt, model = null) {
    const startTime = Date.now();
    console.log(`🔍 Testing ${agent}...`);
    
    try {
      const payload = model ? { prompt, model } : { prompt };
      const response = await this.makeHttpRequest(this.MCP_ENDPOINTS[agent], payload);
      
      const responseTime = Date.now() - startTime;
      const success = !response.error;
      
      this.updateMetrics(agent, responseTime, success);
      
      console.log(`✅ ${agent}: ${responseTime}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
      
      return {
        agent,
        success,
        responseTime,
        response: success ? response.reply : response.error,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${agent}: ${responseTime}ms - ERROR: ${error.message}`);
      
      return {
        agent,
        success: false,
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString()
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
    
    // Keep only last 5 metrics for demo
    if (this.metrics.responseTime[agent].length > 5) {
      this.metrics.responseTime[agent].shift();
      this.metrics.accuracy[agent].shift();
    }
  }

  async executeTaskDemo() {
    console.log('\\n🎯 DEMO: Executing Unity Android App task with agent voting');
    console.log('=' .repeat(60));
    
    const prompt = `
You are designing a Unity-based Android app for a D&D MMORPG. 

Task: "Basic Unity Android App with networking"

Provide a concise implementation plan covering:
1. Unity project setup for Android
2. Networking architecture (WebSockets/REST)
3. Basic scene structure
4. Performance considerations for mobile

Keep response under 300 words for demo purposes.
    `;

    // Test each agent
    const responses = await Promise.all([
      this.testAgent('deepseek', prompt, 'deepseek-coder'),
      this.testAgent('gpt4', prompt),
      this.testAgent('claude', prompt)
    ]);

    // Quick voting simulation
    const votingResults = this.simulateVoting(responses);
    
    console.log('\\n🗳️  Voting Results:');
    console.log(`Winner: ${votingResults.winner}`);
    console.log(`Consensus: ${votingResults.consensus}`);
    
    return { responses, votingResults };
  }

  simulateVoting(responses) {
    // Simple scoring based on success and response time
    const scores = responses.map(r => {
      if (!r.success) return 0;
      
      // Score: 10 points for success, minus penalty for slow response
      const timeScore = Math.max(0, 10 - (r.responseTime / 1000));
      return 10 + timeScore;
    });

    const maxScore = Math.max(...scores);
    const winnerIndex = scores.indexOf(maxScore);
    const winner = responses[winnerIndex]?.agent || 'none';
    
    const consensus = maxScore > 15 ? 'high' : maxScore > 10 ? 'medium' : 'low';
    
    return { winner, consensus, scores };
  }

  displayMetrics() {
    console.log('\\n📊 A2A System Performance Metrics');
    console.log('=' .repeat(50));
    
    for (const agent of this.agents) {
      const responseTimes = this.metrics.responseTime[agent] || [];
      const accuracy = this.metrics.accuracy[agent] || [];
      
      if (responseTimes.length === 0) {
        console.log(`${agent.toUpperCase()}: No data yet`);
        continue;
      }
      
      const avgTime = (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(0);
      const successRate = ((accuracy.reduce((a, b) => a + b, 0) / accuracy.length) * 100).toFixed(0);
      const lastResponse = responseTimes[responseTimes.length - 1];
      
      console.log(`${agent.toUpperCase()}:`);
      console.log(`  Avg Response: ${avgTime}ms`);
      console.log(`  Success Rate: ${successRate}%`);
      console.log(`  Last Request: ${lastResponse}ms`);
      console.log(`  Total Tests: ${responseTimes.length}`);
    }
  }

  async runMonitoringDemo() {
    console.log('🚀 D&D MMORPG A2A Monitoring System');
    console.log('🤖 Real-time Agent Performance Tracking');
    console.log('=' .repeat(60));
    
    // Execute demo task
    const taskResult = await this.executeTaskDemo();
    
    // Display performance metrics
    this.displayMetrics();
    
    // Show best responses
    console.log('\\n🏆 Best Agent Responses:');
    console.log('=' .repeat(30));
    
    const successfulResponses = taskResult.responses.filter(r => r.success);
    if (successfulResponses.length > 0) {
      const best = successfulResponses.sort((a, b) => a.responseTime - b.responseTime)[0];
      console.log(`🥇 Fastest: ${best.agent} (${best.responseTime}ms)`);
      console.log(`📝 Preview: ${best.response.substring(0, 200)}...`);
    }
    
    // Generate improvement recommendations
    this.generateRecommendations();
    
    return taskResult;
  }

  generateRecommendations() {
    console.log('\\n💡 System Improvement Recommendations:');
    console.log('=' .repeat(40));
    
    const recommendations = [];
    
    // Analyze response times
    for (const agent of this.agents) {
      const times = this.metrics.responseTime[agent] || [];
      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        if (avgTime > 10000) {
          recommendations.push(`⚠️  ${agent} is slow (${avgTime.toFixed(0)}ms avg) - consider timeout optimization`);
        }
        if (avgTime < 3000) {
          recommendations.push(`✅ ${agent} is fast (${avgTime.toFixed(0)}ms avg) - good for real-time tasks`);
        }
      }
    }
    
    // Analyze accuracy
    for (const agent of this.agents) {
      const accuracy = this.metrics.accuracy[agent] || [];
      if (accuracy.length > 0) {
        const successRate = accuracy.reduce((a, b) => a + b, 0) / accuracy.length;
        if (successRate < 0.8) {
          recommendations.push(`⚠️  ${agent} has low success rate (${(successRate * 100).toFixed(0)}%) - check API keys`);
        }
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All agents performing well - system ready for production');
    }
    
    recommendations.forEach(rec => console.log(rec));
  }
}

// Run the monitoring demo
if (require.main === module) {
  const monitor = new DnDMonitor();
  monitor.runMonitoringDemo().catch(console.error);
}

module.exports = DnDMonitor;