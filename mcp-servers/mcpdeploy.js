#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { program } from 'commander';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Safely read a file, return empty string on error
function readFileSyncSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Recursively scan for MCP server directories
function findServers(rootDir) {
  const matches = new Set();

  function walk(dir) {
    // Ignore node_modules directories
    if (path.basename(dir) === 'node_modules') {
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    let hasMcpFile = false;
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('-mcp.js') || entry.name.endsWith('-mcp.py'))) {
        hasMcpFile = true;
        break;
      }
    }

    if (hasMcpFile || path.basename(dir).includes('-mcp')) {
        matches.add(dir);
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        walk(fullPath);
      }
    }
  }

  walk(rootDir);
  return Array.from(matches);
}

// Choose which Python entrypoint to use
function chooseEntrypoint(dir, override) {
  const files = fs.readdirSync(dir);
  if (override) {
    if (!files.includes(override)) return null;
    return override;
  }

  const hasEp   = files.includes('mcp_entrypoint.py');
  const hasMain = files.includes('mcp_server.py');
  if (hasEp && hasMain) {
    console.warn('Warning: both entrypoints found. Defaulting to mcp_entrypoint.py');
    return 'mcp_entrypoint.py';
  }
  if (hasEp)   return 'mcp_entrypoint.py';
  if (hasMain) return 'mcp_server.py';
  return null;
}

// Validate an MCP server directory
function validateMcpServer(dir, entrypoint) {
  console.log(`Validating: ${dir}`);
  let ok = true;

  if (fs.existsSync(path.join(dir, 'requirements.txt'))) {
    const reqTxt = readFileSyncSafe(path.join(dir, 'requirements.txt')).toLowerCase();
    if (!reqTxt.includes('fastapi') && !reqTxt.includes('flask')) {
      console.error('Error: requirements.txt must include "fastapi" or "flask".');
      ok = false;
    }

    const script = readFileSyncSafe(path.join(dir, entrypoint));
    if (!/app\s*=/.test(script) && !/def\s+main\(/.test(script)) {
      console.error(`Error: ${entrypoint} lacks "app =" or "def main(...)".`);
      ok = false;
    }

    // Optional FastAPI route check
    if (reqTxt.includes('fastapi') && !/@app\.(get|post|put|delete)\(/.test(script)) {
      console.warn('Warning: no FastAPI routes (@app.get(), @app.post(), etc.) found.');
    }
  } else if (fs.existsSync(path.join(dir, 'package.json'))) {
    // For JS servers, we'll just check for the presence of a package.json
    // and a valid entrypoint.
    const packageJson = JSON.parse(readFileSyncSafe(path.join(dir, 'package.json')));
    if (!packageJson.main && !fs.existsSync(path.join(dir, 'index.js')) && !fs.existsSync(path.join(dir, 'server.js')) && !fs.existsSync(path.join(dir, 'app.js'))) {
        console.error('Error: package.json does not have a main entrypoint, and no index.js, server.js, or app.js found.');
        ok = false;
    }
  }

  return ok;
}

// Generate a Dockerfile for the MCP server
function createDockerfile(dir, entrypoint) {
  const configFile = ['mcp_config.json','config.yaml','.env']
    .find(f => fs.existsSync(path.join(dir, f)));

  const lines = [
    'FROM python:3.11-slim',
    'WORKDIR /app',
    'COPY . /app',
    'RUN pip install --no-cache-dir -r requirements.txt',
    'ENV MCP_PORT=8080'
  ];

  if (configFile) {
    lines.push(`ENV MCP_CONFIG=/app/${configFile}`);
  }

  lines.push('EXPOSE 8080');
  lines.push(
    `CMD python ${entrypoint} --port=$MCP_PORT${configFile ? ' --config=$MCP_CONFIG' : ''}`
  );

  fs.writeFileSync(path.join(dir, 'Dockerfile'), lines.join('\n'));
}

// Build a Docker image from the directory
function buildImage(dir, imageName) {
  try {
    console.log(`Building image "${imageName}" from ${dir}...`);
    execSync(`docker build -t ${imageName} ${dir}`, { stdio: 'inherit' });
    console.log(`✅ Built ${imageName}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to build ${imageName}: ${err.message}`);
    return false;
  }
}

// Scaffold a brand-new MCP server
function scaffoldMcpServer(name, opts) {
  const dest = path.resolve(process.cwd(), name);
  if (fs.existsSync(dest)) {
    console.error(`Directory "${name}" already exists. Aborting.`);
    process.exit(1);
  }

  fs.mkdirSync(dest);
  fs.mkdirSync(path.join(dest, 'context'));
  fs.mkdirSync(path.join(dest, 'models'));

  // 1) requirements.txt
  const deps = opts.framework === 'flask'
    ? 'flask'
    : 'fastapi\nuvicorn';
  fs.writeFileSync(path.join(dest, 'requirements.txt'), deps);

  // 2) Config file
  const cfgName = opts.configFormat === 'yaml' ? 'config.yaml' : 'mcp_config.json';
  const cfgBody = opts.configFormat === 'yaml'
    ? `port: ${opts.port}\ncontext_dir: ./context\n`
    : JSON.stringify({ port: opts.port, context_dir: './context' }, null, 2);
  fs.writeFileSync(path.join(dest, cfgName), cfgBody);

  // 3) Entrypoint script
  const entryFile = opts.framework === 'flask' ? 'mcp_server.py' : 'mcp_entrypoint.py';
  const entryTpl = opts.framework === 'flask'
    ? `from flask import Flask

app = Flask(__name__)

@app.route("/health")
def health():
    return {"status": "ok"}

def main():
    app.run(host="0.0.0.0", port=${opts.port})

if __name__ == "__main__":
    main()
`
    : `from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=${opts.port})
`;
  fs.writeFileSync(path.join(dest, entryFile), entryTpl);

  // 4) Dockerfile scaffold
  createDockerfile(dest, entryFile);

  console.log(`🚀 Scaffolded MCP server at ./${name}`);
}

// ─── CLI Definition ─────────────────────────────────────────────────────────

program
  .name('mcpdeploy')
  .description('Detect, validate, build, or scaffold MCP servers')
  .version('1.0.0');

program
  .command('detect <path>')
  .description('List all MCP server dirs under <path>')
  .action(searchPath => {
    const list = findServers(searchPath);
    if (!list.length) {
      console.log('No MCP servers found.');
    } else {
      list.forEach((d, i) => console.log(`${i+1}. ${d}`));
    }
  });

program
  .command('build <path>')
  .description('Validate and docker-build every MCP server under <path>')
  .option('--entrypoint <file>', 'Override entrypoint filename')
  .option('--image-prefix <prefix>', 'Docker image name prefix', 'mcp_server')
  .action((searchPath, opts) => {
    const servers = findServers(searchPath);
    if (!servers.length) {
      console.log('No MCP servers to build.');
      return;
    }
    servers.forEach((dir, idx) => {
      console.log(`\n🔨 Processing [${idx+1}] ${dir}`);
      if (fs.existsSync(path.join(dir, 'requirements.txt'))) {
        const ep = chooseEntrypoint(dir, opts.entrypoint);
        if (!ep) {
          console.error('No valid entrypoint found. Skipping.');
          return;
        }
        if (!validateMcpServer(dir, ep)) {
          console.error('Validation failed. Skipping.');
          return;
        }
        createDockerfile(dir, ep);
        const tag = `${opts.imagePrefix}_${idx+1}`;
        buildImage(dir, tag);
      } else if (fs.existsSync(path.join(dir, 'package.json'))) {
        if (!validateMcpServer(dir)) {
            console.error('Validation failed. Skipping.');
            return;
        }
        try {
          console.log(`Building JS server in ${dir}`);
          execSync(`npm install --prefix ${dir}`, { stdio: 'inherit' });
          console.log(`✅ Dependencies installed for ${dir}`);
        } catch (err) {
          console.error(`❌ Failed to build ${dir}: ${err.message}`);
        }
      }
    });
  });

program
  .command('create <name>')
  .description('Scaffold a new MCP server directory')
  .option('-f, --framework <fw>', 'fastapi or flask', /^(fastapi|flask)$/i, 'fastapi')
  .option('-p, --port <n>', 'listening port', parseInt, 8080)
  .option('-c, --config-format <fmt>', 'json or yaml', /^(json|yaml)$/i, 'json')
  .action((name, opts) => {
    scaffoldMcpServer(name, {
      framework: opts.framework.toLowerCase(),
      port: opts.port,
      configFormat: opts.configFormat.toLowerCase()
    });
  });

program
  .command('install')
  .description('Install dependencies for all detected MCP servers')
  .action(() => {
    const servers = findServers('.');
    if (!servers.length) {
      console.log('No MCP servers found.');
      return;
    }
    servers.forEach(dir => {
      console.log(`\nInstalling dependencies for ${dir}`);
      if (fs.existsSync(path.join(dir, 'requirements.txt'))) {
        try {
          execSync(`pip install -r ${path.join(dir, 'requirements.txt')}`, { stdio: 'inherit' });
          console.log(`✅ Dependencies installed for ${dir}`);
        } catch (err) {
          console.error(`❌ Failed to install dependencies for ${dir}: ${err.message}`);
        }
      } else if (fs.existsSync(path.join(dir, 'package.json'))) {
        try {
          execSync(`npm install --prefix ${dir}`, { stdio: 'inherit' });
          console.log(`✅ Dependencies installed for ${dir}`);
        } catch (err) {
          console.error(`❌ Failed to install dependencies for ${dir}: ${err.message}`);
        }
      }
    });
  });

program.parse(process.argv);
