FROM node:18-alpine

# Install dependencies for node-gyp and PostgreSQL client
RUN apk add --no-cache python3 make g++ postgresql-client

# Create app directory
WORKDIR /app

# Copy package files with root user first
COPY package*.json ./

# Install dependencies as root
RUN npm install --only=production && \
    npm cache clean --force

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of entire app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Start the application directly (no npm install needed)
CMD ["node", "server.js"]