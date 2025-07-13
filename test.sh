#!/bin/bash

echo "🔧 Fixing SecureOps permissions..."

# Stop all containers
echo "📦 Stopping all containers..."
docker-compose down

# Remove old backend image
echo "🗑️  Removing old backend image..."
docker rmi secureops_backend -f

# Create package-lock.json if not exists
if [ ! -f "backend/package-lock.json" ]; then
    echo "📝 Creating package-lock.json..."
    cd backend
    npm install
    cd ..
fi

# Fix permissions on host
echo "🔐 Fixing file permissions..."
chmod -R 755 backend/
chmod 644 backend/package.json
chmod 644 backend/package-lock.json 2>/dev/null || true

# Rebuild backend image
echo "🏗️  Rebuilding backend image..."
docker-compose build backend --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait a bit
echo "⏳ Waiting for services to stabilize..."
sleep 10

# Check backend logs
echo "📋 Checking backend status..."
docker-compose ps

# Show logs
echo "📜 Backend logs:"
docker-compose logs --tail=50 backend

echo ""
echo "✅ Done! Try accessing:"
echo "   Frontend: http://localhost"
echo "   Backend API: http://localhost:3000/health"
echo ""
echo "If still having issues, try:"
echo "   docker-compose logs -f backend"
