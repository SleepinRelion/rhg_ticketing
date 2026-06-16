#!/bin/bash

echo "Starting Hotel Ticketing System..."
echo "================================="
echo "Server will be available at: http://localhost:3001"
echo "Client will be available at: http://localhost:5173"
echo "================================="

node node_modules/concurrently/dist/bin/concurrently.js --kill-others -n "server,client" -c "bgBlue.bold,bgGreen.bold" "node --watch server/index.js" "cd client && node node_modules/vite/bin/vite.js --host"
