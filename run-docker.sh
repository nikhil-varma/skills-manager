#!/usr/bin/env bash
set -e

PORT="${1:-${PORT:-3001}}"

echo "⚡ Starting SkillDesk in Docker on port ${PORT}..."

# Ensure config directory exists on host
mkdir -p "$HOME/.config/skills-manager"

# Build and start container in detached mode
PORT="$PORT" docker compose up -d --build

echo ""
echo "✅ SkillDesk is running!"
echo "👉 Open your browser at: http://localhost:${PORT}"
echo ""
echo "To view logs:    docker compose logs -f"
echo "To stop:         docker compose down"
