#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

class ClaudeCodeServer {
  constructor() {
    this.server = new Server(
      {
        name: "claude-code",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[Claude Code Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "code_review",
          description: "Perform automated code review and analysis",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to review" },
              language: { type: "string", description: "Programming language" },
              focus: { 
                type: "array", 
                items: { type: "string" },
                description: "Areas to focus on (security, performance, style, etc.)" 
              }
            },
            required: ["code"]
          }
        },
        {
          name: "generate_tests",
          description: "Generate unit tests for given code",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to generate tests for" },
              language: { type: "string", description: "Programming language" },
              framework: { type: "string", description: "Testing framework to use" }
            },
            required: ["code"]
          }
        },
        {
          name: "refactor_code",
          description: "Suggest refactoring improvements for code",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "Code to refactor" },
              goals: { 
                type: "array", 
                items: { type: "string" },
                description: "Refactoring goals (readability, performance, maintainability)" 
              }
            },
            required: ["code"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "code_review":
            return await this.codeReview(request.params.arguments);
          case "generate_tests":
            return await this.generateTests(request.params.arguments);
          case "refactor_code":
            return await this.refactorCode(request.params.arguments);
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

  async codeReview(args) {
    const { code, language = "javascript", focus = ["general"] } = args;
    
    let review = `# Code Review\n\n**Language:** ${language}\n**Focus Areas:** ${focus.join(", ")}\n\n`;
    
    // Basic analysis
    const lines = code.split('\n');
    review += `**Code Metrics:**\n`;
    review += `- Lines of code: ${lines.length}\n`;
    review += `- Functions detected: ${(code.match(/function\s+\w+|def\s+\w+|const\s+\w+\s*=/g) || []).length}\n\n`;
    
    review += `**Review Findings:**\n\n`;
    
    // Check for common issues
    if (focus.includes("security") || focus.includes("general")) {
      review += `**Security:**\n`;
      if (code.includes("eval(") || code.includes("exec(")) {
        review += `- ⚠️ Potential security risk: eval/exec usage detected\n`;
      }
      if (code.includes("innerHTML") || code.includes("dangerouslySetInnerHTML")) {
        review += `- ⚠️ XSS risk: innerHTML usage detected\n`;
      }
      review += `- ✅ No obvious security issues found\n\n`;
    }
    
    if (focus.includes("performance") || focus.includes("general")) {
      review += `**Performance:**\n`;
      if (code.includes("for") && code.includes("length")) {
        review += `- 💡 Consider caching array length in loops\n`;
      }
      if (code.includes("getElementById") && code.split("getElementById").length > 3) {
        review += `- 💡 Consider caching DOM selections\n`;
      }
      review += `\n`;
    }
    
    if (focus.includes("style") || focus.includes("general")) {
      review += `**Code Style:**\n`;
      if (code.includes("var ")) {
        review += `- 💡 Consider using 'const' or 'let' instead of 'var'\n`;
      }
      if (!/^\s*\/\//m.test(code) && !/^\s*\/\*/m.test(code)) {
        review += `- 💡 Consider adding comments for better documentation\n`;
      }
      review += `\n`;
    }
    
    review += `**Recommendations:**\n`;
    review += `1. Follow consistent naming conventions\n`;
    review += `2. Add error handling where appropriate\n`;
    review += `3. Consider breaking down complex functions\n`;
    review += `4. Add unit tests for critical functions\n`;
    
    return {
      content: [{ type: "text", text: review }]
    };
  }

  async generateTests(args) {
    const { code, language = "javascript", framework = "jest" } = args;
    
    let tests = `# Generated Tests\n\n**Framework:** ${framework}\n**Language:** ${language}\n\n`;
    
    // Extract function names
    const functionMatches = code.match(/function\s+(\w+)|const\s+(\w+)\s*=|def\s+(\w+)/g) || [];
    const functions = functionMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[1] || parts[0];
    });
    
    if (framework === "jest" && language === "javascript") {
      tests += `\`\`\`javascript\n`;
      tests += `// Generated test file\n`;
      tests += `const { ${functions.join(", ")} } = require('./your-module');\n\n`;
      
      functions.forEach(func => {
        tests += `describe('${func}', () => {\n`;
        tests += `  test('should handle valid input', () => {\n`;
        tests += `    // Arrange\n`;
        tests += `    const input = /* your test input */;\n`;
        tests += `    const expected = /* expected output */;\n\n`;
        tests += `    // Act\n`;
        tests += `    const result = ${func}(input);\n\n`;
        tests += `    // Assert\n`;
        tests += `    expect(result).toBe(expected);\n`;
        tests += `  });\n\n`;
        tests += `  test('should handle edge cases', () => {\n`;
        tests += `    // Add edge case tests\n`;
        tests += `  });\n`;
        tests += `});\n\n`;
      });
      
      tests += `\`\`\`\n`;
    } else {
      tests += `\`\`\`\n# Test template for ${framework}\n`;
      tests += `# Add appropriate test structure for ${language}\n\`\`\`\n`;
    }
    
    return {
      content: [{ type: "text", text: tests }]
    };
  }

  async refactorCode(args) {
    const { code, goals = ["readability"] } = args;
    
    let refactoring = `# Code Refactoring Suggestions\n\n**Goals:** ${goals.join(", ")}\n\n`;
    
    refactoring += `**Original Code Analysis:**\n`;
    refactoring += `- Lines: ${code.split('\n').length}\n`;
    refactoring += `- Complexity: ${this.calculateComplexity(code)}\n\n`;
    
    refactoring += `**Refactoring Recommendations:**\n\n`;
    
    if (goals.includes("readability")) {
      refactoring += `**Readability Improvements:**\n`;
      refactoring += `1. Extract magic numbers into named constants\n`;
      refactoring += `2. Use descriptive variable names\n`;
      refactoring += `3. Break down complex expressions\n`;
      refactoring += `4. Add inline comments for complex logic\n\n`;
    }
    
    if (goals.includes("performance")) {
      refactoring += `**Performance Improvements:**\n`;
      refactoring += `1. Cache frequently accessed values\n`;
      refactoring += `2. Use efficient data structures\n`;
      refactoring += `3. Minimize DOM manipulations\n`;
      refactoring += `4. Consider memoization for expensive operations\n\n`;
    }
    
    if (goals.includes("maintainability")) {
      refactoring += `**Maintainability Improvements:**\n`;
      refactoring += `1. Follow single responsibility principle\n`;
      refactoring += `2. Use dependency injection\n`;
      refactoring += `3. Add error handling\n`;
      refactoring += `4. Create reusable functions\n\n`;
    }
    
    refactoring += `**Suggested Refactored Structure:**\n`;
    refactoring += `\`\`\`javascript\n`;
    refactoring += `// Refactored code structure\n`;
    refactoring += `// 1. Extract constants\n`;
    refactoring += `// 2. Break down functions\n`;
    refactoring += `// 3. Improve naming\n`;
    refactoring += `// 4. Add error handling\n`;
    refactoring += `\`\`\`\n`;
    
    return {
      content: [{ type: "text", text: refactoring }]
    };
  }

  calculateComplexity(code) {
    // Simple complexity calculation
    const complexityKeywords = ['if', 'for', 'while', 'switch', 'catch', '&&', '||'];
    let complexity = 1;
    
    complexityKeywords.forEach(keyword => {
      const matches = code.match(new RegExp(keyword, 'g'));
      if (matches) complexity += matches.length;
    });
    
    if (complexity <= 5) return "Low";
    if (complexity <= 10) return "Medium";
    return "High";
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Claude Code MCP Server running on stdio");
  }
}

const server = new ClaudeCodeServer();
server.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});