#!/usr/bin/env bash
set -euo pipefail

# 1) Initialize npm (if package.json doesn’t exist)
if [[ ! -f package.json ]]; then
  echo "→ Initializing npm project…"
  npm init -y
fi

# 2) Ensure ESM mode in package.json
echo "→ Configuring package.json for ESM and scripts…"
node -e "
  const pkg = require('./package.json');
  pkg.type = 'module';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.detect = 'node mcpdeploy.js detect .';
  pkg.scripts.build  = 'node mcpdeploy.js build .';
  pkg.scripts.create = 'node mcpdeploy.js create';
  require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 3) Install commander
echo "→ Installing dependencies…"
npm install commander

# 4) Create .gitignore
if [[ ! -f .gitignore ]]; then
  echo "→ Creating .gitignore…"
  cat > .gitignore <<EOF
node_modules/
.env
Dockerfile
EOF
fi

# 5) Make sure your CLI entrypoint exists
if [[ ! -f mcpdeploy.js ]]; then
  echo "→ Creating stub mcpdeploy.js…"
  cat > mcpdeploy.js <<'EOF'
#!/usr/bin/env node
console.log("Drop your mcpdeploy.js implementation here.")
EOF
  chmod +x mcpdeploy.js
fi

# 6) Create placeholder test harness
if [[ ! -d tests ]]; then
  echo "→ Bootstrapping tests/fixtures…"
  mkdir -p tests/fixtures
  cat > tests/test_validator.js <<'EOF'
import { expect } from 'chai';
describe('MCP Validator stub', () => {
  it('loads the module', () => {
    const mod = require('../mcpdeploy.js');
    expect(mod).to.exist;
  });
});
EOF
fi

echo
echo "✅ Setup complete!"
echo "  • Run 'npm run detect' to auto-detect MCP servers under './'."
echo "  • Run 'npm run build'  to validate & docker-build them."
echo "  • Run 'npm run create <name>' to scaffold a new server."
