#!/usr/bin/env node

/**
 * MCP Ecosystem Manager
 * 
 * Comprehensive management tool for the entire MCP server ecosystem
 * Provides health monitoring, configuration validation, and deployment management
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class MCPEcosystemManager {
  constructor() {
    this.configPath = '/mnt/c/Users/posso/AppData/Roaming/Claude/claude_desktop_config.json';
    this.serverPath = '/mnt/c/Users/posso/mcp-servers';
    this.config = null;
    this.serverStatus = new Map();
    this.healthChecks = new Map();
  }

  async initialize() {
    console.log('🚀 Initializing MCP Ecosystem Manager...');
    await this.loadConfiguration();
    await this.analyzeEcosystem();
    await this.generateHealthReport();
  }

  async loadConfiguration() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log(`✅ Loaded configuration with ${Object.keys(this.config.mcpServers).length} servers`);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      throw error;
    }
  }

  async analyzeEcosystem() {
    console.log('\n📊 Analyzing MCP Ecosystem...');
    
    const servers = this.config.mcpServers;
    const categories = {
      'Foundation': ['github', 'memory', 'postgres', 'puppeteer'],
      'Development Tools': ['eslint', 'claude-code', 'docker', 'jupyter'],
      'Integration': ['deepseek', 'notion', 'slack', 'jenkins', 'kanban'],
      'Utilities': ['sequential-thinking', 'weather', 'sqlite'],
      'Custom Intelligence': ['advanced-thinking', 'orchestrator', 'autonomous-sdlc'],
      'Framework': ['mcp-framework', 'database-api-coordination'],
      'Revolutionary AI': ['neural-evolution', 'omniscient-context', 'quantum-orchestrator', 'transcendent-consciousness', 'adic'],
      'Advanced Workflow': ['workflow-intelligence', 'development-optimization'],
      'Continuous Development': ['continuous-development-loop', 'sdlc-loop-orchestrator', 'automated-feedback-loop', 'continuous-improvement-engine'],
      'Legacy': ['udocker']
    };

    for (const [category, serverList] of Object.entries(categories)) {
      console.log(`\n${category}:`);
      for (const serverName of serverList) {
        if (servers[serverName]) {
          const status = await this.checkServerHealth(serverName, servers[serverName]);
          console.log(`  ${status.icon} ${serverName}: ${status.message}`);
          this.serverStatus.set(serverName, status);
        }
      }
    }
  }

  async checkServerHealth(name, config) {
    const health = {
      name,
      status: 'unknown',
      icon: '❓',
      message: 'Status unknown',
      issues: [],
      recommendations: []
    };

    // Check if it's an NPX package
    if (config.command === 'npx') {
      health.type = 'npx';
      health.status = 'configured';
      health.icon = '📦';
      health.message = 'NPX package configured';
      
      // Check for missing API keys
      if (config.env) {
        for (const [key, value] of Object.entries(config.env)) {
          if (value.includes('your_') || value.includes('_here')) {
            health.issues.push(`Missing API key: ${key}`);
            health.recommendations.push(`Set ${key} environment variable`);
            health.status = 'needs_config';
            health.icon = '⚠️';
            health.message = 'Needs API key configuration';
          }
        }
      }
    }
    
    // Check if it's a local Node.js server
    else if (config.command === 'node') {
      health.type = 'local';
      const serverPath = config.args[0];
      // Convert Windows path to Unix path for checking
      const unixPath = serverPath.replace(/C:\\/g, '/mnt/c/').replace(/\\/g, '/');
      
      if (fs.existsSync(unixPath)) {
        health.status = 'ready';
        health.icon = '✅';
        health.message = 'Local server ready';
        
        // Check if it's one of our advanced servers
        if (this.isAdvancedServer(name)) {
          health.icon = '🧠';
          health.message = 'Advanced AI server ready';
        }
      } else {
        health.status = 'missing';
        health.icon = '❌';
        health.message = 'Server file not found';
        health.issues.push(`File not found: ${serverPath}`);
        health.recommendations.push('Recreate server file');
      }
    }
    
    // Check if it's a Python server
    else if (config.command === 'python') {
      health.type = 'python';
      const serverPath = config.args[0];
      // Convert Windows path to Unix path for checking
      const unixPath = serverPath.replace(/C:\\/g, '/mnt/c/').replace(/\\/g, '/');
      
      if (fs.existsSync(unixPath)) {
        health.status = 'ready';
        health.icon = '🐍';
        health.message = 'Python server ready';
      } else {
        health.status = 'missing';
        health.icon = '❌';
        health.message = 'Python server not found';
        health.issues.push(`File not found: ${serverPath}`);
      }
    }

    return health;
  }

  isAdvancedServer(name) {
    const advancedServers = [
      'neural-evolution', 'omniscient-context', 'quantum-orchestrator',
      'transcendent-consciousness', 'adic', 'workflow-intelligence',
      'development-optimization', 'database-api-coordination',
      'continuous-development-loop', 'sdlc-loop-orchestrator', 
      'automated-feedback-loop', 'continuous-improvement-engine'
    ];
    return advancedServers.includes(name);
  }

  async generateHealthReport() {
    console.log('\n📋 Generating Health Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.serverStatus.size,
        ready: 0,
        needs_config: 0,
        missing: 0,
        unknown: 0
      },
      categories: {},
      issues: [],
      recommendations: []
    };

    // Compile statistics
    for (const [name, status] of this.serverStatus) {
      report.summary[status.status]++;
      
      if (status.issues.length > 0) {
        report.issues.push(...status.issues.map(issue => `${name}: ${issue}`));
      }
      
      if (status.recommendations.length > 0) {
        report.recommendations.push(...status.recommendations.map(rec => `${name}: ${rec}`));
      }
    }

    // Save report
    const reportPath = path.join(this.serverPath, 'ecosystem-health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Health Summary:`);
    console.log(`  ✅ Ready: ${report.summary.ready}`);
    console.log(`  ⚠️  Needs Config: ${report.summary.needs_config}`);
    console.log(`  ❌ Missing: ${report.summary.missing}`);
    console.log(`  ❓ Unknown: ${report.summary.unknown}`);
    
    if (report.issues.length > 0) {
      console.log(`\n⚠️  Issues Found:`);
      report.issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => console.log(`    - ${rec}`));
    }

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    return report;
  }

  async generateConfigurationBackup() {
    const backupPath = path.join(this.serverPath, `config-backup-${Date.now()}.json`);
    fs.copyFileSync(this.configPath, backupPath);
    console.log(`💾 Configuration backup saved to: ${backupPath}`);
    return backupPath;
  }

  async generateEnvironmentTemplate() {
    const template = {
      "// Environment Variables Template": "Copy to .env file and fill in actual values",
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here",
      "DEEPSEEK_API_KEY": "your_deepseek_api_key_here",
      "NOTION_API_TOKEN": "your_notion_token_here",
      "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token",
      "SLACK_APP_TOKEN": "xapp-your-slack-app-token",
      "JENKINS_URL": "http://localhost:8080",
      "JENKINS_USERNAME": "admin",
      "JENKINS_PASSWORD": "your_jenkins_password",
      "PLANKA_BASE_URL": "http://localhost:3000",
      "PLANKA_ADMIN_ID": "your_planka_admin_id",
      "PLANKA_AGENT_EMAIL": "your_email@example.com",
      "PLANKA_AGENT_PASSWORD": "your_planka_password",
      "POSTGRES_CONNECTION_STRING": "postgresql://localhost:5432/postgres"
    };

    const templatePath = path.join(this.serverPath, 'environment-template.json');
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
    console.log(`🔧 Environment template saved to: ${templatePath}`);
    return templatePath;
  }

  async generateStartupScript() {
    const script = `#!/bin/bash

# MCP Ecosystem Startup Script
echo "🚀 Starting MCP Ecosystem..."

# Check if Claude Desktop is running
echo "📋 Checking Claude Desktop status..."

# Check server health
echo "🏥 Running health checks..."
node ${this.serverPath}/mcp-ecosystem-manager.js

# Start any additional services
echo "⚙️  Starting additional services..."

# PostgreSQL (if not running)
# pg_ctl start -D /usr/local/var/postgres

# Docker (if needed)
# systemctl start docker

echo "✅ MCP Ecosystem startup complete!"
echo "📊 Check health report for any issues"
`;

    const scriptPath = path.join(this.serverPath, 'startup.sh');
    fs.writeFileSync(scriptPath, script);
    
    // Make executable on Unix systems
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      // Windows doesn't support chmod
    }
    
    console.log(`🚀 Startup script saved to: ${scriptPath}`);
    return scriptPath;
  }

  async generateMaintenanceGuide() {
    const guide = `# MCP Ecosystem Maintenance Guide

## Quick Health Check
\`\`\`bash
node mcp-ecosystem-manager.js
\`\`\`

## Common Issues and Solutions

### Missing API Keys
1. Copy environment-template.json to .env
2. Fill in actual API keys
3. Restart Claude Desktop

### Server Not Starting
1. Check server file exists
2. Verify Node.js installation
3. Check for syntax errors in server files

### Performance Issues
1. Monitor CPU/memory usage
2. Check server logs
3. Consider disabling heavy AI servers temporarily

## Server Categories

### Foundation Servers
- **github**: GitHub integration
- **memory**: Conversation memory
- **postgres**: Database operations
- **puppeteer**: Web automation

### Revolutionary AI Servers
- **neural-evolution**: Code evolution using genetic algorithms
- **quantum-orchestrator**: Quantum development paradigms
- **transcendent-consciousness**: Consciousness-level programming
- **workflow-intelligence**: Advanced workflow orchestration
- **development-optimization**: Predictive code optimization

### Integration Servers
- **slack**: Team communication
- **notion**: Documentation management
- **jenkins**: CI/CD integration

## Backup and Recovery
1. Regular configuration backups
2. Server file versioning
3. Environment variable documentation

## Troubleshooting
- Check Claude Desktop logs
- Verify server paths
- Test individual servers
- Monitor system resources
`;

    const guidePath = path.join(this.serverPath, 'MAINTENANCE.md');
    fs.writeFileSync(guidePath, guide);
    console.log(`📖 Maintenance guide saved to: ${guidePath}`);
    return guidePath;
  }

  async run() {
    try {
      await this.initialize();
      await this.generateConfigurationBackup();
      await this.generateEnvironmentTemplate();
      await this.generateStartupScript();
      await this.generateMaintenanceGuide();
      
      console.log('\n🎉 MCP Ecosystem Management Complete!');
      console.log('📁 Generated files:');
      console.log('  - ecosystem-health-report.json');
      console.log('  - config-backup-{timestamp}.json');
      console.log('  - environment-template.json');
      console.log('  - startup.sh');
      console.log('  - MAINTENANCE.md');
      
    } catch (error) {
      console.error('❌ Ecosystem management failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new MCPEcosystemManager();
  manager.run();
}

module.exports = MCPEcosystemManager;