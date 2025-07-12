FROM node:18-alpine

# Install dependencies for node-gyp and PostgreSQL client
RUN apk add --no-cache python3 make g++ postgresql-client

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

# Make wait script executable
COPY scripts/wait-for-postgres.sh /usr/local/bin/wait-for-postgres.sh
RUN chmod +x /usr/local/bin/wait-for-postgres.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application with wait script
CMD ["sh", "-c", "/usr/local/bin/wait-for-postgres.sh $DB_HOST node server.js"]
