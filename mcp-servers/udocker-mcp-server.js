#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

class UDockerServer {
  constructor() {
    this.server = new Server(
      {
        name: "udocker-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[UDocker Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "docker_system_info",
          description: "Get Docker system information and status",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "list_docker_images",
          description: "List all Docker images with details",
          inputSchema: {
            type: "object",
            properties: {
              filter: { type: "string", description: "Optional filter for images" }
            }
          }
        },
        {
          name: "list_docker_containers",
          description: "List Docker containers (running or all)",
          inputSchema: {
            type: "object",
            properties: {
              all: { type: "boolean", description: "Show all containers (default: false)" },
              filter: { type: "string", description: "Optional filter for containers" }
            }
          }
        },
        {
          name: "docker_container_logs",
          description: "Get logs from a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container: { type: "string", description: "Container name or ID" },
              lines: { type: "number", description: "Number of lines to show (default: 100)" },
              follow: { type: "boolean", description: "Follow log output (default: false)" }
            },
            required: ["container"]
          }
        },
        {
          name: "docker_container_stats",
          description: "Get resource usage statistics for containers",
          inputSchema: {
            type: "object",
            properties: {
              container: { type: "string", description: "Container name or ID (optional)" }
            }
          }
        },
        {
          name: "docker_network_list",
          description: "List Docker networks",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "docker_volume_list",
          description: "List Docker volumes",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "docker_compose_status",
          description: "Check Docker Compose project status",
          inputSchema: {
            type: "object",
            properties: {
              project_path: { type: "string", description: "Path to docker-compose.yml" }
            },
            required: ["project_path"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "docker_system_info":
            return await this.dockerSystemInfo();
          case "list_docker_images":
            return await this.listDockerImages(request.params.arguments);
          case "list_docker_containers":
            return await this.listDockerContainers(request.params.arguments);
          case "docker_container_logs":
            return await this.dockerContainerLogs(request.params.arguments);
          case "docker_container_stats":
            return await this.dockerContainerStats(request.params.arguments);
          case "docker_network_list":
            return await this.dockerNetworkList();
          case "docker_volume_list":
            return await this.dockerVolumeList();
          case "docker_compose_status":
            return await this.dockerComposeStatus(request.params.arguments);
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

  async executeCommand(command) {
    try {
      const { stdout, stderr } = await exec(command);
      return { stdout: stdout.trim(), stderr: stderr.trim(), success: true };
    } catch (error) {
      return { 
        stdout: '', 
        stderr: error.message, 
        success: false,
        error: error.message
      };
    }
  }

  async dockerSystemInfo() {
    const result = await this.executeCommand('docker system info --format json');
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Docker system info failed: ${result.error}` }]
      };
    }

    try {
      const info = JSON.parse(result.stdout);
      const formatted = `# Docker System Information

**Server Version:** ${info.ServerVersion || 'N/A'}
**Storage Driver:** ${info.Driver || 'N/A'}
**Containers:** ${info.Containers || 0} (${info.ContainersRunning || 0} running)
**Images:** ${info.Images || 0}
**Architecture:** ${info.Architecture || 'N/A'}
**Operating System:** ${info.OperatingSystem || 'N/A'}
**Total Memory:** ${info.MemTotal ? (info.MemTotal / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'N/A'}
**Docker Root Directory:** ${info.DockerRootDir || 'N/A'}
`;
      return {
        content: [{ type: "text", text: formatted }]
      };
    } catch (parseError) {
      return {
        content: [{ type: "text", text: `Raw output:\n${result.stdout}` }]
      };
    }
  }

  async listDockerImages(args = {}) {
    const { filter = '' } = args;
    let command = 'docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.CreatedSince}}\\t{{.Size}}"';
    
    if (filter) {
      command += ` --filter "${filter}"`;
    }

    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list images: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Docker Images\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async listDockerContainers(args = {}) {
    const { all = false, filter = '' } = args;
    let command = 'docker ps --format "table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"';
    
    if (all) {
      command += ' -a';
    }
    
    if (filter) {
      command += ` --filter "${filter}"`;
    }

    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list containers: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Docker Containers\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async dockerContainerLogs(args) {
    const { container, lines = 100, follow = false } = args;
    let command = `docker logs ${container} --tail ${lines}`;
    
    if (follow) {
      command += ' --follow';
    }

    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to get logs for ${container}: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Logs for ${container}\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async dockerContainerStats(args = {}) {
    const { container = '' } = args;
    let command = 'docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}"';
    
    if (container) {
      command += ` ${container}`;
    }

    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to get container stats: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Container Statistics\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async dockerNetworkList() {
    const command = 'docker network ls --format "table {{.Name}}\\t{{.Driver}}\\t{{.Scope}}"';
    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list networks: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Docker Networks\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async dockerVolumeList() {
    const command = 'docker volume ls --format "table {{.Name}}\\t{{.Driver}}\\t{{.Scope}}"';
    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to list volumes: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Docker Volumes\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async dockerComposeStatus(args) {
    const { project_path } = args;
    const command = `cd "${project_path}" && docker-compose ps --format table`;
    const result = await this.executeCommand(command);
    
    if (!result.success) {
      return {
        content: [{ type: "text", text: `Failed to get compose status: ${result.error}` }]
      };
    }

    return {
      content: [{ type: "text", text: `# Docker Compose Status (${project_path})\n\n\`\`\`\n${result.stdout}\n\`\`\`` }]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("UDocker MCP Server running on stdio");
  }
}

const server = new UDockerServer();
server.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});