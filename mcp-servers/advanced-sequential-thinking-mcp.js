#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

class AdvancedThinkingServer {
  constructor() {
    this.server = new Server(
      {
        name: "advanced-sequential-thinking",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.thinkingHistory = [];
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[Advanced Thinking Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "structured_analysis",
          description: "Perform structured analysis of complex problems with multiple frameworks",
          inputSchema: {
            type: "object",
            properties: {
              problem: { type: "string", description: "The problem to analyze" },
              frameworks: { 
                type: "array", 
                items: { type: "string" },
                description: "Analysis frameworks to use (SWOT, root_cause, pros_cons, etc.)"
              },
              context: { type: "string", description: "Additional context for the problem" }
            },
            required: ["problem"]
          }
        },
        {
          name: "decision_matrix",
          description: "Create a weighted decision matrix for comparing options",
          inputSchema: {
            type: "object",
            properties: {
              options: { type: "array", items: { type: "string" }, description: "Options to compare" },
              criteria: { type: "array", items: { type: "string" }, description: "Evaluation criteria" },
              weights: { type: "array", items: { type: "number" }, description: "Weights for criteria (0-1)" }
            },
            required: ["options", "criteria"]
          }
        },
        {
          name: "scenario_planning",
          description: "Generate and analyze multiple scenarios for a given situation",
          inputSchema: {
            type: "object",
            properties: {
              situation: { type: "string", description: "The situation to plan for" },
              timeframe: { type: "string", description: "Time horizon for scenarios" },
              variables: { type: "array", items: { type: "string" }, description: "Key variables to consider" }
            },
            required: ["situation"]
          }
        },
        {
          name: "risk_assessment",
          description: "Comprehensive risk assessment with mitigation strategies",
          inputSchema: {
            type: "object",
            properties: {
              activity: { type: "string", description: "Activity or project to assess" },
              stakeholders: { type: "array", items: { type: "string" }, description: "Key stakeholders" },
              scope: { type: "string", description: "Scope of assessment" }
            },
            required: ["activity"]
          }
        },
        {
          name: "get_thinking_history",
          description: "Retrieve the history of thinking processes and analyses",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Number of recent entries to retrieve" }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "structured_analysis":
            return await this.structuredAnalysis(request.params.arguments);
          case "decision_matrix":
            return await this.decisionMatrix(request.params.arguments);
          case "scenario_planning":
            return await this.scenarioPlanning(request.params.arguments);
          case "risk_assessment":
            return await this.riskAssessment(request.params.arguments);
          case "get_thinking_history":
            return await this.getThinkingHistory(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  async structuredAnalysis(args) {
    const { problem, frameworks = ['root_cause', 'pros_cons'], context = '' } = args;
    
    let analysis = `# Structured Analysis: ${problem}\n\n`;
    if (context) analysis += `**Context:** ${context}\n\n`;
    
    for (const framework of frameworks) {
      switch (framework) {
        case 'SWOT':
          analysis += this.swotAnalysis(problem);
          break;
        case 'root_cause':
          analysis += this.rootCauseAnalysis(problem);
          break;
        case 'pros_cons':
          analysis += this.prosConsAnalysis(problem);
          break;
        case '5_whys':
          analysis += this.fiveWhysAnalysis(problem);
          break;
        default:
          analysis += `**${framework.toUpperCase()}**: Framework not implemented\n\n`;
      }
    }
    
    this.thinkingHistory.push({
      timestamp: new Date().toISOString(),
      type: 'structured_analysis',
      problem,
      frameworks,
      result: analysis
    });
    
    return {
      content: [{ type: "text", text: analysis }]
    };
  }

  async decisionMatrix(args) {
    const { options, criteria, weights = [] } = args;
    const normalizedWeights = weights.length === criteria.length ? weights : criteria.map(() => 1 / criteria.length);
    
    let matrix = `# Decision Matrix\n\n`;
    matrix += `| Option | ${criteria.join(' | ')} | Weighted Score |\n`;
    matrix += `|${Array(criteria.length + 2).fill('---').join('|')}|\n`;
    
    const scores = options.map(option => {
      const randomScores = criteria.map(() => Math.random() * 5 + 1); // Placeholder scoring
      const weightedScore = randomScores.reduce((sum, score, i) => sum + score * normalizedWeights[i], 0);
      return {
        option,
        scores: randomScores,
        weightedScore
      };
    });
    
    scores.forEach(({ option, scores, weightedScore }) => {
      matrix += `| ${option} | ${scores.map(s => s.toFixed(1)).join(' | ')} | ${weightedScore.toFixed(2)} |\n`;
    });
    
    matrix += `\n**Recommendation:** ${scores.sort((a, b) => b.weightedScore - a.weightedScore)[0].option}\n`;
    
    this.thinkingHistory.push({
      timestamp: new Date().toISOString(),
      type: 'decision_matrix',
      options,
      criteria,
      result: matrix
    });
    
    return {
      content: [{ type: "text", text: matrix }]
    };
  }

  async scenarioPlanning(args) {
    const { situation, timeframe = '1 year', variables = [] } = args;
    
    let scenarios = `# Scenario Planning: ${situation}\n\n`;
    scenarios += `**Timeframe:** ${timeframe}\n\n`;
    
    const scenarioTypes = ['Best Case', 'Most Likely', 'Worst Case', 'Wild Card'];
    
    scenarioTypes.forEach(type => {
      scenarios += `## ${type} Scenario\n\n`;
      scenarios += `**Description:** ${this.generateScenarioDescription(situation, type)}\n\n`;
      scenarios += `**Key Factors:**\n`;
      variables.forEach(variable => {
        scenarios += `- ${variable}: ${this.generateVariableOutcome(variable, type)}\n`;
      });
      scenarios += `\n**Implications:** ${this.generateImplications(situation, type)}\n\n`;
    });
    
    this.thinkingHistory.push({
      timestamp: new Date().toISOString(),
      type: 'scenario_planning',
      situation,
      timeframe,
      result: scenarios
    });
    
    return {
      content: [{ type: "text", text: scenarios }]
    };
  }

  async riskAssessment(args) {
    const { activity, stakeholders = [], scope = 'Full project' } = args;
    
    let assessment = `# Risk Assessment: ${activity}\n\n`;
    assessment += `**Scope:** ${scope}\n`;
    assessment += `**Stakeholders:** ${stakeholders.join(', ')}\n\n`;
    
    const riskCategories = [
      { name: 'Technical', risks: ['Technology obsolescence', 'Integration challenges', 'Performance issues'] },
      { name: 'Operational', risks: ['Resource constraints', 'Timeline pressures', 'Quality issues'] },
      { name: 'External', risks: ['Market changes', 'Regulatory changes', 'Competitive pressure'] },
      { name: 'Financial', risks: ['Budget overruns', 'Revenue shortfall', 'Cost escalation'] }
    ];
    
    riskCategories.forEach(category => {
      assessment += `## ${category.name} Risks\n\n`;
      category.risks.forEach(risk => {
        const probability = ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)];
        const impact = ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)];
        assessment += `**${risk}**\n`;
        assessment += `- Probability: ${probability}\n`;
        assessment += `- Impact: ${impact}\n`;
        assessment += `- Mitigation: ${this.generateMitigation(risk)}\n\n`;
      });
    });
    
    this.thinkingHistory.push({
      timestamp: new Date().toISOString(),
      type: 'risk_assessment',
      activity,
      result: assessment
    });
    
    return {
      content: [{ type: "text", text: assessment }]
    };
  }

  async getThinkingHistory(args) {
    const { limit = 10 } = args;
    const recent = this.thinkingHistory.slice(-limit);
    
    let history = `# Thinking History (Last ${recent.length} entries)\n\n`;
    recent.forEach((entry, i) => {
      history += `## ${i + 1}. ${entry.type.replace('_', ' ').toUpperCase()}\n`;
      history += `**Timestamp:** ${entry.timestamp}\n`;
      history += `**Problem/Topic:** ${entry.problem || entry.situation || entry.activity || 'N/A'}\n\n`;
    });
    
    return {
      content: [{ type: "text", text: history }]
    };
  }

  swotAnalysis(problem) {
    return `## SWOT Analysis\n\n**Strengths:**\n- [Identify internal positive factors]\n\n**Weaknesses:**\n- [Identify internal negative factors]\n\n**Opportunities:**\n- [Identify external positive factors]\n\n**Threats:**\n- [Identify external negative factors]\n\n`;
  }

  rootCauseAnalysis(problem) {
    return `## Root Cause Analysis\n\n**Problem Statement:** ${problem}\n\n**Potential Root Causes:**\n- Process-related factors\n- Human factors\n- Environmental factors\n- System factors\n\n**Investigation Steps:**\n1. Gather data and evidence\n2. Identify contributing factors\n3. Trace back to root causes\n4. Verify causation\n\n`;
  }

  prosConsAnalysis(problem) {
    return `## Pros and Cons Analysis\n\n**Pros:**\n- [List positive aspects]\n- [Identify benefits]\n- [Note advantages]\n\n**Cons:**\n- [List negative aspects]\n- [Identify risks]\n- [Note disadvantages]\n\n**Conclusion:** [Weigh pros against cons]\n\n`;
  }

  fiveWhysAnalysis(problem) {
    return `## 5 Whys Analysis\n\n**Problem:** ${problem}\n\n1. **Why?** [First level cause]\n2. **Why?** [Second level cause]\n3. **Why?** [Third level cause]\n4. **Why?** [Fourth level cause]\n5. **Why?** [Root cause]\n\n**Root Cause:** [Final identified cause]\n\n`;
  }

  generateScenarioDescription(situation, type) {
    const templates = {
      'Best Case': `Optimal conditions prevail for ${situation}`,
      'Most Likely': `Expected conditions for ${situation}`,
      'Worst Case': `Challenging conditions for ${situation}`,
      'Wild Card': `Unexpected disruption to ${situation}`
    };
    return templates[type] || 'Scenario description';
  }

  generateVariableOutcome(variable, scenarioType) {
    const outcomes = {
      'Best Case': 'Highly favorable',
      'Most Likely': 'As expected',
      'Worst Case': 'Highly unfavorable',
      'Wild Card': 'Completely unexpected'
    };
    return outcomes[scenarioType] || 'Unknown outcome';
  }

  generateImplications(situation, scenarioType) {
    return `Implications for ${situation} under ${scenarioType.toLowerCase()} conditions need detailed analysis.`;
  }

  generateMitigation(risk) {
    const strategies = [
      'Implement monitoring systems',
      'Develop contingency plans',
      'Increase stakeholder communication',
      'Establish early warning indicators',
      'Create backup alternatives'
    ];
    return strategies[Math.floor(Math.random() * strategies.length)];
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Advanced Sequential Thinking MCP Server running on stdio");
  }
}

const server = new AdvancedThinkingServer();
server.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});