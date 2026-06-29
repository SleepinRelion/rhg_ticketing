#!/bin/bash
# deploy.sh
# Automates the deployment process on the Ubuntu server.
# Ensure this script has execution permissions: chmod +x deploy.sh

set -e

echo "🏨 Starting Deployment Process..."

# 1. Pull latest code (if using git)
# echo "Pulling latest code..."
# git pull origin main

# 2. Audit dependencies for critical vulnerabilities
echo "Auditing dependencies for critical vulnerabilities..."
npm audit --audit-level=critical || { echo "❌ Critical vulnerabilities found in dependencies. Deployment halted. Fix them and try again."; exit 1; }

# 3. Rebuild the application container
echo "Building Docker container..."
sudo docker compose build app

# 3. Start/Restart services in detached mode
echo "Restarting services..."
sudo docker compose up -d

# 4. Wait a few seconds for DB to be fully ready
echo "Waiting for services to stabilize..."
sleep 5

# 5. Run Database Migrations automatically
echo "Running database migrations..."
sudo docker compose exec -T app npm run migrate

# 6. Run Database Seeding automatically (Idempotent)
echo "Running database seeds..."
sudo docker compose exec -T app npm run seed

# 7. Add specific hotel rooms (Idempotent)
echo "Ensuring Poste Lafayette rooms..."
sudo docker compose exec -T app node server/scripts/setup_hotel_rooms.js

echo "Ensuring Azuri rooms..."
sudo docker compose exec -T app node server/scripts/add_azuri_rooms.js

echo "✅ Deployment completed successfully!"
