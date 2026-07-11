#!/bin/sh
# Startup script: seed the database then launch the API server
echo "🌱 Running database seed..."
node src/db/seed.js
echo "🚀 Starting API server..."
node server.js
