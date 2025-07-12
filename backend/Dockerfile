FROM node:18-alpine

# Install dependencies for node-gyp and PostgreSQL client
RUN apk add --no-cache python3 make g++ postgresql-client wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p uploads logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]