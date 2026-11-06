#!/usr/bin/env bash
set -e

echo "⚡ Starting SkillDesk in Docker..."

# Ensure config directory exists on host
mkdir -p "$HOME/.config/skills-manager"

# Build and start container in detached mode
docker compose up -d --build

echo ""
echo "✅ SkillDesk is running!"
echo "👉 Open your browser at: http://localhost:3001"
echo ""
echo "To view logs:    docker compose logs -f"
echo "To stop:         docker compose down"
