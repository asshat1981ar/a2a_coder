#!/usr/bin/env node
/**
 * D&D MMORPG Project Orchestrator with Agent Voting
 * Coordinates multiple AI agents to execute the game design
 */

const http = require('http');
const fs = require('fs');

// MCP Server endpoints
const MCP_ENDPOINTS = {
  claude: 'http://localhost:4040/mcp/claude/completion',
  gpt4: 'http://localhost:8000/mcp/gpt4/completion', 
  deepseek: 'http://localhost:8001/mcp/deepseek/completion'
};

// Agent voting and coordination
class DnDOrchestrator {
  constructor() {
    this.agents = ['claude', 'gpt4', 'deepseek'];
    this.projectState = {
      phase: 'Phase1_CoreSystems',
      tasks: [],
      completedTasks: [],
      agentVotes: {},
      systemMetrics: {
        responseTime: {},
        accuracy: {},
        consensus: {}
      }
    };
    this.loadProjectDesign();
  }

  loadProjectDesign() {
    try {
      const design = fs.readFileSync('./dnd_mmorpg_design.md', 'utf8');
      console.log('✅ Loaded D&D MMORPG design document');
      this.extractTasks(design);
    } catch (error) {
      console.error('❌ Failed to load design document:', error.message);
    }
  }

  extractTasks(design) {
    // Extract Phase 1 tasks from the design document
    this.projectState.tasks = [
      {
        id: 'core_unity_setup',
        title: 'Basic Unity Android App with networking',
        priority: 'high',
        agents: ['deepseek', 'gpt4'],
        status: 'pending'
      },
      {
        id: 'a2a_npc_integration', 
        title: 'A2A Integration for NPC dialogue',
        priority: 'high',
        agents: ['claude', 'deepseek'],
        status: 'pending'
      },
      {
        id: 'combat_system',
        title: 'Simple Combat System implementation',
        priority: 'medium',
        agents: ['gpt4', 'deepseek'],
        status: 'pending'
      },
      {
        id: 'world_regions',
        title: 'Basic World with 1-2 regions',
        priority: 'medium', 
        agents: ['claude', 'gpt4'],
        status: 'pending'
      }
    ];
    console.log(`📋 Extracted ${this.projectState.tasks.length} Phase 1 tasks`);
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
      req.write(postData);
      req.end();
    });
  }

  async queryAgent(agent, prompt, model = null) {
    const startTime = Date.now();
    try {
      const payload = model ? { prompt, model } : { prompt };
      const response = await this.makeHttpRequest(MCP_ENDPOINTS[agent], payload);
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(agent, responseTime, !response.error);
      
      return {
        agent,
        success: !response.error,
        response: response.reply || response.error,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Agent ${agent} failed:`, error.message);
      return {
        agent,
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  updateMetrics(agent, responseTime, success) {
    if (!this.projectState.systemMetrics.responseTime[agent]) {
      this.projectState.systemMetrics.responseTime[agent] = [];
    }
    if (!this.projectState.systemMetrics.accuracy[agent]) {
      this.projectState.systemMetrics.accuracy[agent] = [];
    }
    
    this.projectState.systemMetrics.responseTime[agent].push(responseTime);
    this.projectState.systemMetrics.accuracy[agent].push(success ? 1 : 0);
    
    // Keep only last 10 metrics
    if (this.projectState.systemMetrics.responseTime[agent].length > 10) {
      this.projectState.systemMetrics.responseTime[agent].shift();
      this.projectState.systemMetrics.accuracy[agent].shift();
    }
  }

  async executeTaskWithVoting(task) {
    console.log(`\\n🎯 Executing task: ${task.title}`);
    console.log(`👥 Assigned agents: ${task.agents.join(', ')}`);
    
    const prompt = `
You are working on a D&D-inspired MMORPG for Android. Current task: "${task.title}"

Project Context:
- Unity-based mobile game with AI-powered NPCs
- Real-time multiplayer with A2A agent integration  
- Dynamic world that responds to player decisions

Provide a detailed technical implementation plan for this specific task. Include:
1. Step-by-step implementation approach
2. Code examples or pseudocode where relevant
3. Technical challenges and solutions
4. Integration points with other systems
5. Testing and validation approach

Focus on practical, actionable guidance for developers.
    `;

    // Get responses from assigned agents
    const agentPromises = task.agents.map(agent => {
      const model = agent === 'deepseek' ? 'deepseek-coder' : undefined;
      return this.queryAgent(agent, prompt, model);
    });

    const responses = await Promise.all(agentPromises);
    
    // Analyze responses and vote
    const votingResults = await this.conductVoting(task, responses);
    
    // Select best response
    const bestResponse = this.selectBestResponse(responses, votingResults);
    
    console.log(`\\n✅ Task completed with ${bestResponse.agent} solution`);
    console.log(`📊 Voting results:`, votingResults.summary);
    
    return {
      task,
      responses,
      votingResults,
      selectedSolution: bestResponse,
      timestamp: new Date().toISOString()
    };
  }

  async conductVoting(task, responses) {
    console.log('🗳️  Conducting agent voting for best solution...');
    
    const votingPrompt = `
You are evaluating solutions for the task: "${task.title}" in a D&D MMORPG project.

Here are the proposed solutions:

${responses.map((r, i) => `
Solution ${i + 1} (${r.agent}):
${r.success ? r.response : 'FAILED: ' + r.error}
`).join('\\n')}

Rate each solution (1-10) on:
1. Technical feasibility
2. Code quality and structure  
3. Integration with game systems
4. Performance considerations
5. Maintainability

Provide your ratings in this exact format:
RATINGS:
Solution1: [score1]
Solution2: [score2] 
Solution3: [score3]

REASONING: [brief explanation of your evaluation]
    `;

    // Have each agent vote on all solutions (including their own)
    const votingPromises = this.agents.map(agent => 
      this.queryAgent(agent, votingPrompt)
    );

    const votes = await Promise.all(votingPromises);
    
    // Parse voting results
    const parsedVotes = this.parseVotes(votes, responses.length);
    const summary = this.calculateVotingSummary(parsedVotes, responses);

    return {
      votes: parsedVotes,
      summary,
      consensus: summary.consensusLevel
    };
  }

  parseVotes(votes, numSolutions) {
    const parsed = [];
    
    votes.forEach(vote => {
      if (!vote.success) return;
      
      const ratings = {};
      const response = vote.response;
      
      // Extract ratings using regex
      const ratingsMatch = response.match(/RATINGS:[\\s\\S]*?(?=REASONING:|$)/i);
      if (ratingsMatch) {
        for (let i = 1; i <= numSolutions; i++) {
          const scoreMatch = response.match(new RegExp(`Solution${i}:\\s*(\\d+)`, 'i'));
          if (scoreMatch) {
            ratings[`solution${i}`] = parseInt(scoreMatch[1]);
          }
        }
      }
      
      parsed.push({
        voter: vote.agent,
        ratings,
        reasoning: response.match(/REASONING:\\s*([\\s\\S]*?)$/i)?.[1]?.trim() || 'No reasoning provided'
      });
    });
    
    return parsed;
  }

  calculateVotingSummary(votes, responses) {
    const solutionScores = {};
    const voterCount = votes.length;
    
    // Initialize scores
    responses.forEach((_, i) => {
      solutionScores[`solution${i + 1}`] = { total: 0, count: 0, average: 0 };
    });
    
    // Aggregate votes
    votes.forEach(vote => {
      Object.entries(vote.ratings).forEach(([solution, score]) => {
        if (solutionScores[solution] && score >= 1 && score <= 10) {
          solutionScores[solution].total += score;
          solutionScores[solution].count++;
        }
      });
    });
    
    // Calculate averages
    Object.values(solutionScores).forEach(score => {
      score.average = score.count > 0 ? score.total / score.count : 0;
    });
    
    // Determine consensus level
    const averages = Object.values(solutionScores).map(s => s.average);
    const maxScore = Math.max(...averages);
    const minScore = Math.min(...averages);
    const consensusLevel = maxScore - minScore <= 2 ? 'high' : maxScore - minScore <= 4 ? 'medium' : 'low';
    
    return {
      solutionScores,
      consensusLevel,
      voterParticipation: voterCount / this.agents.length,
      winner: responses[averages.indexOf(maxScore)]?.agent || 'unknown'
    };
  }

  selectBestResponse(responses, votingResults) {
    // Select based on voting if available, otherwise use first successful response
    const winnerAgent = votingResults.summary.winner;
    return responses.find(r => r.agent === winnerAgent && r.success) || 
           responses.find(r => r.success) || 
           responses[0];
  }

  async monitorSystem() {
    console.log('\\n📊 System Monitoring Report');
    console.log('=' .repeat(50));
    
    // Agent performance metrics
    for (const agent of this.agents) {
      const responseTimes = this.projectState.systemMetrics.responseTime[agent] || [];
      const accuracy = this.projectState.systemMetrics.accuracy[agent] || [];
      
      const avgResponseTime = responseTimes.length > 0 ? 
        (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : 'N/A';
      const accuracyRate = accuracy.length > 0 ? 
        ((accuracy.reduce((a, b) => a + b, 0) / accuracy.length) * 100).toFixed(1) : 'N/A';
      
      console.log(`${agent.toUpperCase()}:`);
      console.log(`  Avg Response Time: ${avgResponseTime}ms`);
      console.log(`  Success Rate: ${accuracyRate}%`);
      console.log(`  Requests: ${responseTimes.length}`);
    }
    
    // Project progress
    const totalTasks = this.projectState.tasks.length;
    const completedTasks = this.projectState.completedTasks.length;
    const progressPercent = ((completedTasks / totalTasks) * 100).toFixed(1);
    
    console.log(`\\nProject Progress: ${completedTasks}/${totalTasks} tasks (${progressPercent}%)`);
    console.log(`Current Phase: ${this.projectState.phase}`);
  }

  async executeProject() {
    console.log('🚀 Starting D&D MMORPG Project Execution');
    console.log('🤖 A2A Multi-Agent Orchestration Active');
    console.log('=' .repeat(60));
    
    for (const task of this.projectState.tasks) {
      try {
        const result = await this.executeTaskWithVoting(task);
        this.projectState.completedTasks.push(result);
        task.status = 'completed';
        
        // Monitor system after each task
        await this.monitorSystem();
        
        // Short delay between tasks
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Task failed: ${task.title}`, error.message);
        task.status = 'failed';
      }
    }
    
    console.log('\\n🎉 Project execution completed!');
    await this.generateFinalReport();
  }

  async generateFinalReport() {
    const report = {
      projectSummary: {
        phase: this.projectState.phase,
        totalTasks: this.projectState.tasks.length,
        completedTasks: this.projectState.completedTasks.length,
        successRate: (this.projectState.completedTasks.length / this.projectState.tasks.length * 100).toFixed(1)
      },
      agentPerformance: {},
      recommendations: []
    };
    
    // Calculate agent performance
    for (const agent of this.agents) {
      const responseTimes = this.projectState.systemMetrics.responseTime[agent] || [];
      const accuracy = this.projectState.systemMetrics.accuracy[agent] || [];
      
      report.agentPerformance[agent] = {
        avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        successRate: accuracy.length > 0 ? accuracy.reduce((a, b) => a + b, 0) / accuracy.length : 0,
        totalRequests: responseTimes.length
      };
    }
    
    // Generate recommendations
    const fastestAgent = Object.entries(report.agentPerformance)
      .sort((a, b) => a[1].avgResponseTime - b[1].avgResponseTime)[0];
    const mostAccurate = Object.entries(report.agentPerformance)
      .sort((a, b) => b[1].successRate - a[1].successRate)[0];
    
    report.recommendations = [
      `Fastest Agent: ${fastestAgent[0]} (${fastestAgent[1].avgResponseTime.toFixed(2)}ms avg)`,
      `Most Reliable: ${mostAccurate[0]} (${(mostAccurate[1].successRate * 100).toFixed(1)}% success rate)`,
      'Consider load balancing based on agent strengths',
      'Implement retry logic for failed requests'
    ];
    
    // Save report
    fs.writeFileSync('./dnd_project_report.json', JSON.stringify(report, null, 2));
    console.log('\\n📄 Final report saved to dnd_project_report.json');
    
    return report;
  }
}

// Start the orchestrator
if (require.main === module) {
  const orchestrator = new DnDOrchestrator();
  orchestrator.executeProject().catch(console.error);
}

module.exports = DnDOrchestrator;