#!/usr/bin/env node

/**
 * MCP Server Validator
 * 
 * Validates individual MCP servers for syntax, structure, and functionality
 * Provides detailed analysis and recommendations for server improvements
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPServerValidator {
  constructor() {
    this.serverPath = 'C:\\Users\\posso\\mcp-servers';
    this.validationResults = new Map();
    this.serverFiles = [];
  }

  async initialize() {
    console.log('🔍 Initializing MCP Server Validator...');
    await this.discoverServers();
    await this.validateAllServers();
    await this.generateValidationReport();
  }

  async discoverServers() {
    const files = fs.readdirSync(this.serverPath);
    this.serverFiles = files.filter(file => 
      file.endsWith('-mcp.js') || 
      file.endsWith('-server.js') ||
      file === 'mcp-orchestrator.js'
    );
    
    console.log(`📁 Discovered ${this.serverFiles.length} server files`);
    this.serverFiles.forEach(file => console.log(`  - ${file}`));
  }

  async validateAllServers() {
    console.log('\n🔬 Validating servers...');
    
    for (const serverFile of this.serverFiles) {
      const serverPath = path.join(this.serverPath, serverFile);
      const validation = await this.validateServer(serverPath);
      this.validationResults.set(serverFile, validation);
      
      console.log(`${validation.status === 'valid' ? '✅' : validation.status === 'warning' ? '⚠️' : '❌'} ${serverFile}: ${validation.summary}`);
    }
  }

  async validateServer(serverPath) {
    const validation = {
      file: path.basename(serverPath),
      status: 'unknown',
      summary: '',
      details: {
        syntax: { valid: false, errors: [] },
        structure: { valid: false, issues: [] },
        tools: { count: 0, list: [] },
        dependencies: { missing: [], present: [] },
        best_practices: { score: 0, recommendations: [] }
      },
      recommendations: []
    };

    try {
      // Check if file exists
      if (!fs.existsSync(serverPath)) {
        validation.status = 'error';
        validation.summary = 'File not found';
        return validation;
      }

      // Read and parse file
      const content = fs.readFileSync(serverPath, 'utf8');
      
      // Syntax validation
      validation.details.syntax = await this.validateSyntax(content);
      
      // Structure validation
      validation.details.structure = await this.validateStructure(content);
      
      // Tool analysis
      validation.details.tools = await this.analyzeTools(content);
      
      // Dependency analysis
      validation.details.dependencies = await this.analyzeDependencies(content);
      
      // Best practices check
      validation.details.best_practices = await this.checkBestPractices(content);
      
      // Overall status determination
      if (!validation.details.syntax.valid) {
        validation.status = 'error';
        validation.summary = 'Syntax errors detected';
      } else if (validation.details.structure.issues.length > 0) {
        validation.status = 'warning';
        validation.summary = 'Structure issues found';
      } else {
        validation.status = 'valid';
        validation.summary = `Valid server with ${validation.details.tools.count} tools`;
      }
      
      // Generate recommendations
      validation.recommendations = this.generateRecommendations(validation.details);
      
    } catch (error) {
      validation.status = 'error';
      validation.summary = `Validation failed: ${error.message}`;
    }

    return validation;
  }

  async validateSyntax(content) {
    const syntax = { valid: true, errors: [] };
    
    try {
      // Basic syntax check by attempting to parse
      new Function(content);
    } catch (error) {
      syntax.valid = false;
      syntax.errors.push(error.message);
    }
    
    return syntax;
  }

  async validateStructure(content) {
    const structure = { valid: true, issues: [] };
    
    // Check for required MCP structure
    const requiredPatterns = [
      { pattern: /require.*@modelcontextprotocol\/sdk/, name: 'MCP SDK import' },
      { pattern: /class\s+\w+/, name: 'Server class definition' },
      { pattern: /ListToolsRequestSchema/, name: 'ListTools handler' },
      { pattern: /CallToolRequestSchema/, name: 'CallTool handler' },
      { pattern: /StdioServerTransport/, name: 'Transport setup' }
    ];
    
    for (const { pattern, name } of requiredPatterns) {
      if (!pattern.test(content)) {
        structure.issues.push(`Missing ${name}`);
        structure.valid = false;
      }
    }
    
    return structure;
  }

  async analyzeTools(content) {
    const tools = { count: 0, list: [] };
    
    // Extract tool definitions
    const toolMatches = content.match(/name:\s*["']([^"']+)["']/g) || [];
    tools.list = toolMatches.map(match => 
      match.replace(/name:\s*["']([^"']+)["']/, '$1')
    );
    tools.count = tools.list.length;
    
    return tools;
  }

  async analyzeDependencies(content) {
    const deps = { missing: [], present: [] };
    
    // Extract require statements
    const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
    const dependencies = requireMatches.map(match => 
      match.replace(/require\(['"]([^'"]+)['"]/, '$1')
    );
    
    for (const dep of dependencies) {
      try {
        require.resolve(dep);
        deps.present.push(dep);
      } catch (error) {
        if (!dep.startsWith('./') && !dep.startsWith('../')) {
          deps.missing.push(dep);
        }
      }
    }
    
    return deps;
  }

  async checkBestPractices(content) {
    const practices = { score: 0, recommendations: [] };
    const checks = [
      { test: /error.*handling|try.*catch/i, points: 10, name: 'Error handling' },
      { test: /console\.error|console\.log/i, points: 5, name: 'Logging' },
      { test: /description.*:/i, points: 15, name: 'Tool descriptions' },
      { test: /inputSchema/i, points: 15, name: 'Input validation' },
      { test: /async.*await/i, points: 10, name: 'Async operations' },
      { test: /\/\*\*[\s\S]*?\*\//m, points: 15, name: 'Documentation' },
      { test: /env|environment/i, points: 10, name: 'Environment configuration' },
      { test: /initialize|setup/i, points: 10, name: 'Initialization' }
    ];
    
    for (const check of checks) {
      if (check.test.test(content)) {
        practices.score += check.points;
      } else {
        practices.recommendations.push(`Add ${check.name.toLowerCase()}`);
      }
    }
    
    practices.score = Math.min(practices.score, 100);
    return practices;
  }

  generateRecommendations(details) {
    const recommendations = [];
    
    if (!details.syntax.valid) {
      recommendations.push('Fix syntax errors before deployment');
    }
    
    if (details.structure.issues.length > 0) {
      recommendations.push('Address structural issues for proper MCP compliance');
    }
    
    if (details.tools.count === 0) {
      recommendations.push('Add at least one tool definition');
    }
    
    if (details.dependencies.missing.length > 0) {
      recommendations.push(`Install missing dependencies: ${details.dependencies.missing.join(', ')}`);
    }
    
    if (details.best_practices.score < 70) {
      recommendations.push('Improve best practices implementation');
      recommendations.push(...details.best_practices.recommendations.slice(0, 3));
    }
    
    return recommendations;
  }

  async generateValidationReport() {
    console.log('\n📊 Generating Validation Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.validationResults.size,
        valid: 0,
        warning: 0,
        error: 0
      },
      servers: {},
      overall_recommendations: []
    };

    // Compile results
    for (const [filename, validation] of this.validationResults) {
      report.summary[validation.status]++;
      report.servers[filename] = validation;
    }

    // Generate overall recommendations
    if (report.summary.error > 0) {
      report.overall_recommendations.push('Fix servers with syntax errors immediately');
    }
    
    if (report.summary.warning > 0) {
      report.overall_recommendations.push('Address structural issues in warning servers');
    }
    
    report.overall_recommendations.push('Regularly validate servers after modifications');
    report.overall_recommendations.push('Implement comprehensive error handling');
    report.overall_recommendations.push('Add detailed tool descriptions and input schemas');

    // Save report
    const reportPath = path.join(this.serverPath, 'server-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Validation Summary:`);
    console.log(`  ✅ Valid: ${report.summary.valid}`);
    console.log(`  ⚠️  Warning: ${report.summary.warning}`);
    console.log(`  ❌ Error: ${report.summary.error}`);
    
    console.log(`\n📄 Detailed validation report saved to: ${reportPath}`);
    return report;
  }

  async run() {
    try {
      await this.initialize();
      console.log('\n🎉 Server validation complete!');
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new MCPServerValidator();
  validator.run();
}

module.exports = MCPServerValidator;