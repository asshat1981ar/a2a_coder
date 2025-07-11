#!/usr/bin/env node

// MCP Bundle Orchestrator - Main entry point for the MCP Server Bundle extension
// This server coordinates multiple MCP servers and provides a unified interface

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import MCPInteractionFramework from './mcp-interaction-framework.js';

class MCPBundleOrchestrator {
  constructor() {
    this.server = new Server(
      {
        name: "mcp-bundle-orchestrator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.mcpInteractionFramework = new MCPInteractionFramework();
    this.availableServers = [
      { name: "memory", status: "available", description: "Knowledge graph and entity tracking" },
      { name: "eslint", status: "available", description: "JavaScript/TypeScript linting" },
      { name: "sequential-thinking", status: "available", description: "Advanced reasoning" },
      { name: "weather", status: "available", description: "Weather information" },
      { name: "docker", status: "available", description: "Container management" },
      { name: "github", status: "needs_api_key", description: "GitHub integration" },
      { name: "deepseek", status: "needs_api_key", description: "AI assistance" },
      { name: "notion", status: "needs_api_key", description: "Notion integration" },
      { name: "jenkins", status: "needs_config", description: "CI/CD management" }
    ];

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[MCP Bundle Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_available_servers",
          description: "List all available MCP servers in the bundle",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "check_server_status",
          description: "Check the status of a specific MCP server",
          inputSchema: {
            type: "object",
            properties: {
              server_name: {
                type: "string",
                description: "Name of the server to check"
              }
            },
            required: ["server_name"]
          }
        },
        {
          name: "get_setup_instructions",
          description: "Get setup instructions for servers requiring configuration",
          inputSchema: {
            type: "object",
            properties: {
              server_name: {
                type: "string",
                description: "Name of the server (optional, returns all if not specified)"
              }
            }
          }
        },
        {
          name: "bundle_info",
          description: "Get information about this MCP server bundle",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "register_external_ai_app_via_orchestrator",
          description: "Register an external AI application (e.g., ChatGPT, Copilot, Claude Desktop) with the framework via the orchestrator.",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Unique name for the external AI application." },
              type: { type: "string", description: "Type of the external AI application (e.g., 'openai', 'github_copilot', 'claude_desktop')." },
              config: { type: "object", description: "Configuration object for the external AI application (e.g., apiKey, model, endpoint)." }
            },
            required: ["name", "type", "config"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_available_servers":
            return this.handleListServers();
          case "check_server_status":
            return this.handleCheckServerStatus(args);
          case "get_setup_instructions":
            return this.handleGetSetupInstructions(args);
          case "bundle_info":
            return this.handleBundleInfo();
          case "register_external_ai_app_via_orchestrator":
            return this.handleRegisterExternalAIAppViaOrchestrator(args);
          case "call_external_ai_tool_via_orchestrator":
            return this.handleCallExternalAIToolViaOrchestrator(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async handleListServers() {
    const serverList = this.availableServers.map(server => 
      `🔸 **${server.name}** (${server.status}) - ${server.description}`
    ).join("\n");

    const summary = {
      total: this.availableServers.length,
      available: this.availableServers.filter(s => s.status === "available").length,
      needs_config: this.availableServers.filter(s => s.status !== "available").length
    };

    return {
      content: [
        {
          type: "text",
          text: `📊 **MCP Server Bundle - Available Servers**\n\n` +
                `**Summary:** ${summary.total} total servers (${summary.available} ready, ${summary.needs_config} need configuration)\n\n` +
                `**Servers:**\n${serverList}\n\n` +
                `**Status Legend:**\n` +
                `• available - Ready to use immediately\n` +
                `• needs_api_key - Requires API key configuration\n` +
                `• needs_config - Requires additional configuration`
        }
      ]
    };
  }

  async handleCheckServerStatus(args) {
    const { server_name } = args;
    const server = this.availableServers.find(s => s.name === server_name);
    
    if (!server) {
      throw new Error(`Server '${server_name}' not found in bundle`);
    }

    let statusDetails = "";
    switch (server.status) {
      case "available":
        statusDetails = "✅ Ready to use - No configuration required";
        break;
      case "needs_api_key":
        statusDetails = "🔑 Requires API key - Configure in extension settings";
        break;
      case "needs_config":
        statusDetails = "⚙️ Requires configuration - See setup instructions";
        break;
    }

    return {
      content: [
        {
          type: "text",
          text: `🔍 **Server Status: ${server.name}**\n\n` +
                `**Description:** ${server.description}\n` +
                `**Status:** ${statusDetails}\n\n` +
                `Use \`get_setup_instructions\` for configuration help.`
        }
      ]
    };
  }

  async handleGetSetupInstructions(args) {
    const { server_name } = args;
    
    const instructions = {
      github: {
        title: "GitHub Server Setup",
        steps: [
          "1. Go to GitHub Settings > Developer settings > Personal access tokens",
          "2. Generate a new token with 'repo', 'read:org', and 'user:email' scopes",
          "3. Copy the token and add it to the extension configuration",
          "4. Restart Claude Desktop"
        ],
        env_vars: ["GITHUB_PERSONAL_ACCESS_TOKEN"]
      },
      deepseek: {
        title: "DeepSeek Server Setup", 
        steps: [
          "1. Go to https://platform.deepseek.com/",
          "2. Sign up or log in to your account",
          "3. Navigate to API Keys section",
          "4. Generate a new API key",
          "5. Copy the key and add it to the extension configuration"
        ],
        env_vars: ["DEEPSEEK_API_KEY"]
      },
      notion: {
        title: "Notion Server Setup",
        steps: [
          "1. Go to https://developers.notion.com/",
          "2. Create a new integration",
          "3. Copy the Internal Integration Token",
          "4. Add the integration to your Notion pages",
          "5. Add the token to the extension configuration"
        ],
        env_vars: ["NOTION_API_TOKEN"]
      },
      jenkins: {
        title: "Jenkins Server Setup",
        steps: [
          "1. Ensure Jenkins is running and accessible",
          "2. Configure Jenkins URL in extension settings",
          "3. Set up Jenkins username and password/API token",
          "4. Test connection from Claude Desktop"
        ],
        env_vars: ["JENKINS_URL", "JENKINS_USERNAME", "JENKINS_PASSWORD"]
      }
    };

    if (server_name && instructions[server_name]) {
      const instruction = instructions[server_name];
      return {
        content: [
          {
            type: "text",
            text: `📋 **${instruction.title}**\n\n` +
                  `**Steps:**\n${instruction.steps.join("\n")}\n\n` +
                  `**Required Environment Variables:**\n${instruction.env_vars.map(v => `• ${v}`).join("\n")}`
          }
        ]
      };
    } else {
      const allInstructions = Object.entries(instructions)
        .map(([name, inst]) => `**${inst.title}:**\n${inst.steps.slice(0, 2).join("\n")}...\n`)
        .join("\n");
      
      return {
        content: [
          {
            type: "text",
            text: `📚 **Setup Instructions for All Servers**\n\n${allInstructions}\n` +
                  `Use \`get_setup_instructions\` with a specific server name for detailed instructions.`
          }
        ]
      };
    }
  }

  async handleBundleInfo() {
    return {
      content: [
        {
          type: "text",
          text: `🎯 **MCP Server Bundle v1.0.0**\n\n` +
                `**Description:** Complete MCP server collection with 16 pre-configured servers\n\n` +
                `**Included Servers:**\n` +
                `• **Ready to Use (11):** memory, eslint, sequential-thinking, weather, docker, and more\n` +
                `• **Needs API Keys (5):** github, deepseek, notion, jenkins, planka\n\n` +
                `**Features:**\n` +
                `• One-click installation via .dxt extension\n` +
                `• Secure API key storage\n` +
                `• Comprehensive documentation\n` +
                `• Cross-platform compatibility\n\n` +
                `**Usage:** Configure API keys in extension settings, then access servers through Claude Desktop's MCP interface.\n\n` +
                `**Support:** See MCP_API_KEYS_SETUP.md for detailed configuration instructions.`
        }
      ]
    };
  }

  async handleRegisterExternalAIAppViaOrchestrator(args) {
    const response = await this.mcpInteractionFramework.registerExternalAIApplication(args);
    return response;
  }

  async handleCallExternalAIToolViaOrchestrator(args) {
    const response = await this.mcpInteractionFramework.callExternalAITool(args);
    return response;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Bundle Orchestrator running on stdio");
  }
}

export default MCPBundleOrchestrator;

(async () => {
  const orchestrator = new MCPBundleOrchestrator();
  await orchestrator.run();
})();