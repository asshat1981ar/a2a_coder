#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');

class AutonomousSDLCServer {
  constructor() {
    this.server = new Server(
      {
        name: "autonomous-sdlc",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[SDLC Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "create_project_structure",
          description: "Create a standard project structure with common files",
          inputSchema: {
            type: "object",
            properties: {
              projectName: { type: "string", description: "Name of the project" },
              projectType: { 
                type: "string", 
                enum: ["node", "python", "react", "vue", "express"],
                description: "Type of project to create" 
              },
              basePath: { type: "string", description: "Base path where to create project" }
            },
            required: ["projectName", "projectType", "basePath"]
          }
        },
        {
          name: "generate_readme",
          description: "Generate a comprehensive README.md for a project",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: { type: "string", description: "Path to the project" },
              projectName: { type: "string", description: "Name of the project" },
              description: { type: "string", description: "Project description" },
              features: { type: "array", items: { type: "string" }, description: "List of features" }
            },
            required: ["projectPath", "projectName"]
          }
        },
        {
          name: "setup_git_hooks",
          description: "Setup pre-commit hooks and git configuration",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: { type: "string", description: "Path to the project" },
              hooks: { 
                type: "array", 
                items: { type: "string" },
                description: "Hooks to setup (pre-commit, pre-push, etc.)" 
              }
            },
            required: ["projectPath"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "create_project_structure":
            return await this.createProjectStructure(request.params.arguments);
          case "generate_readme":
            return await this.generateReadme(request.params.arguments);
          case "setup_git_hooks":
            return await this.setupGitHooks(request.params.arguments);
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

  async createProjectStructure(args) {
    const { projectName, projectType, basePath } = args;
    const projectPath = path.join(basePath, projectName);
    
    // Create directory structure
    const dirs = ['src', 'tests', 'docs', '.github/workflows'];
    for (const dir of dirs) {
      const fullPath = path.join(projectPath, dir);
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    // Create basic files based on project type
    const templates = this.getProjectTemplates(projectType);
    for (const [fileName, content] of Object.entries(templates)) {
      fs.writeFileSync(path.join(projectPath, fileName), content);
    }
    
    return {
      content: [{ 
        type: "text", 
        text: `Project structure created at: ${projectPath}\nFiles created: ${Object.keys(templates).join(', ')}` 
      }]
    };
  }

  async generateReadme(args) {
    const { projectPath, projectName, description = "", features = [] } = args;
    
    const readme = `# ${projectName}

${description}

## Features

${features.map(f => `- ${f}`).join('\n')}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## License

MIT
`;
    
    fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
    
    return {
      content: [{ type: "text", text: `README.md generated at: ${path.join(projectPath, 'README.md')}` }]
    };
  }

  async setupGitHooks(args) {
    const { projectPath, hooks = ['pre-commit'] } = args;
    const hooksDir = path.join(projectPath, '.git', 'hooks');
    
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    
    const hookTemplates = {
      'pre-commit': `#!/bin/sh
# Pre-commit hook
npm run lint
npm test
`,
      'pre-push': `#!/bin/sh
# Pre-push hook
npm run build
npm test
`
    };
    
    for (const hook of hooks) {
      if (hookTemplates[hook]) {
        const hookPath = path.join(hooksDir, hook);
        fs.writeFileSync(hookPath, hookTemplates[hook]);
        fs.chmodSync(hookPath, '755');
      }
    }
    
    return {
      content: [{ type: "text", text: `Git hooks setup: ${hooks.join(', ')}` }]
    };
  }

  getProjectTemplates(projectType) {
    const common = {
      '.gitignore': `node_modules/
*.log
.env
dist/
build/
.DS_Store
`,
      'package.json': JSON.stringify({
        "name": "new-project",
        "version": "1.0.0",
        "scripts": {
          "start": "node src/index.js",
          "dev": "nodemon src/index.js",
          "test": "jest",
          "lint": "eslint src/"
        }
      }, null, 2)
    };

    const templates = {
      node: {
        ...common,
        'src/index.js': `console.log('Hello, Node.js!');`,
      },
      python: {
        '.gitignore': `__pycache__/
*.pyc
*.pyo
*.pyd
.env/
venv/
.pytest_cache/
`,
        'requirements.txt': `# Add your dependencies here`,
        'main.py': `def main():
    print("Hello, Python!")

if __name__ == "__main__":
    main()
`,
      },
      react: {
        ...common,
        'src/App.js': `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello, React!</h1>
    </div>
  );
}

export default App;
`,
      }
    };

    return templates[projectType] || templates.node;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Autonomous SDLC MCP Server running on stdio");
  }
}

const server = new AutonomousSDLCServer();
server.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});