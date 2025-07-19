FROM node:18-slim

WORKDIR /app

# Configure npm for better timeout handling
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3

# Copy package files
COPY package.json ./

# Install dependencies with timeout handling (including dev dependencies for TypeScript)
RUN npm install --no-package-lock || \
    (sleep 10 && npm install --no-package-lock) || \
    (sleep 20 && npm install --no-package-lock)

COPY . .

# Build the application
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]