# SkillDesk — Complete Usage Guide ⚡

**SkillDesk** is a local macOS application to discover, inspect, sync, and manage AI Agent skills across all your assistants (**Claude Code**, **OpenCode**, **Cursor**, **OpenAI Codex**, **Antigravity**, and your **Shared Hub**).

---

## Table of Contents

1. [Quick Start (Local Development)](#1-quick-start-local-development)
2. [Running with Docker](#2-running-with-docker)
3. [Running on a Custom Port](#3-running-on-a-custom-port)
4. [How to Use the UI](#4-how-to-use-the-ui)
   - [Auto-Discovering Tools & Skills on macOS](#auto-discovering-tools--skills-on-macos)
   - [Managing Skills (Move, Copy, Symlink)](#managing-skills-move-copy-symlink)
   - [Syncing a Skill to All Assistants](#syncing-a-skill-to-all-assistants)
   - [Inspecting and Editing `SKILL.md`](#inspecting-and-editing-skillmd)
   - [Creating a New Agent Skill](#creating-a-new-agent-skill)
   - [Adding Custom Workspace Repositories](#adding-custom-workspace-repositories)
5. [Architecture & File Locations](#5-architecture--file-locations)
6. [Troubleshooting & FAQ](#6-troubleshooting--faq)

---

## 1. Quick Start (Local Development)

### Prerequisites
- Node.js (v18, v20, or v22+)
- npm, pnpm, or bun

### Step 1: Clone or Navigate to the Project
```bash
cd /Users/nikhilvarma/Desktop/work/projects/skills-manager
```

### Step 2: Install Dependencies (If not already installed)
```bash
npm install
```

### Step 3: Start Frontend and Backend Concurrently
```bash
npm run dev
```

This single command starts:
- 🟦 **Backend API Server**: `http://localhost:3001`
- 🟪 **Vite Frontend (Hot-Reloading)**: `http://localhost:5173`

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## 2. Running with Docker

SkillDesk includes a multi-stage Docker build so you can share it with anyone without requiring Node.js or npm on their machine.

### One-Command Start (Helper Script)
```bash
./run-docker.sh
```

### Or Using Standard Docker Compose
```bash
docker compose up -d
```

Open your browser to: **[http://localhost:3001](http://localhost:3001)**

### Useful Docker Commands
```bash
# View live container logs
docker compose logs -f

# Stop the container
docker compose down

# Rebuild the container image after updating code
docker compose up -d --build
```

> **How Docker interacts with your Mac:**  
> The container mounts `${HOME}:/host_home:rw` and sets `HOST_HOME=/host_home`. This allows the container to scan your host's actual `~/.claude/skills`, `~/.config/opencode/skills`, `~/.agents/skills`, etc., and make real symlinks and copies directly on your host macOS file system.

---

## 3. Running on a Custom Port

You can run SkillDesk on any port (for example, `8080`, `4000`, etc.):

### In Docker
Pass the port to the helper script:
```bash
./run-docker.sh 8080
```
Or with `docker compose`:
```bash
PORT=8080 docker compose up -d
```
Then visit: `http://localhost:8080`

### In Standalone Mode (Node.js)
```bash
PORT=8080 npm start
```
Then visit: `http://localhost:8080`

### In Development Mode (`npm run dev`)
To change the frontend port:
```bash
npm run client -- --port 8080
```
Then visit: `http://localhost:8080`

---

## 4. How to Use the UI

### Auto-Discovering Tools & Skills on macOS
1. In the top navigation bar, click the **"⚡ Auto-Detect Tools"** button.
2. SkillDesk immediately scans:
   - Global assistants: **Claude Code**, **OpenCode**, **Cursor**, **Codex**, **Antigravity**, **Shared Hub**.
   - Your local project repositories in `~/Desktop/work/projects`, `~/Projects`, `~/Developer`, etc.
3. Review the found tools and project skill folders.
4. Check the ones you want to track and click **"Add Selected Tools"**. They will immediately appear on your dashboard!

---

### Managing Skills (Move, Copy, Symlink)

#### Symlink & Un-symlink
- **To Symlink:** Click the **"+" (Add)** button in any assistant column to immediately link the skill to that assistant.
- **To Un-symlink:** Click the **"×"** on the Symlink badge directly in the table. You will get two options:
  - **Un-symlink (Remove):** Safely deletes the symlink without touching the canonical files in `~/.agents/skills`.
  - **Detach to Copy:** Replaces the symlink with an independent, physical copy of the folder so you can customize it independently.

#### Copy
If you want an independent fork of a skill that you can modify without affecting the original:
- Open the skill details and go to the **Move & Sync** tab.
- Select the target assistant and click **"Copy"**.

#### Move
To transfer a skill entirely from one assistant to another:
- In the **Move & Sync** tab, select the destination and click **"Move"**.

---

### Syncing a Skill to All Assistants
Want a skill to be available across **Claude Code**, **OpenCode**, **Cursor**, and **Antigravity** all at once?
- In the Table View, click the **Sparkles (⚡)** icon in the Actions column for that skill. It will immediately symlink the skill to all missing assistants.

---

### Inspecting and Editing `SKILL.md`
1. Click on any skill's name or the **"View Spec"** button.
2. **Documentation Tab**: View rendered GitHub-flavored Markdown instructions, YAML frontmatter, authors, licenses, and symlink targets.
3. **Edit SKILL.md Tab**: Edit the instruction prompt and metadata directly in your browser. Click **"Save Changes"** to write back to disk immediately.
4. **Files Tab**: View any supporting scripts, reference docs, or assets stored inside the skill's folder.
5. **macOS Finder**: Click the **External Link** icon in the header to reveal the folder in macOS Finder.

---

### Creating a New Agent Skill
1. Click the **"+ New Skill"** button in the top navigation bar.
2. Enter:
   - **Skill Name / Identifier**: e.g., `react-performance-audit`
   - **Description**: What the skill does and when the AI assistant should invoke it.
   - **Author**: Your name or team.
   - **Primary Platform**: Choose where to store it (or select *Shared Hub*).
   - Check **"Automatically share with other assistants"** to automatically symlink it to all your AI tools.
3. Click **"Create Skill"**. SkillDesk scaffolds the directory with a standardized `SKILL.md` template with YAML frontmatter.

---

### Adding Custom Workspace Repositories
Have a specific workspace repository with project-level skills (e.g. `~/my-project/.claude/skills`)?
1. Click the **Settings (⚙️)** icon in the top navigation bar.
2. Under **"Add Custom Project or Tool Location"**:
   - Enter a display name: `My Project Skills`
   - Enter the path: `~/my-project/.claude/skills`
3. Click **"Add Location to List"** and **"Save Settings"**.
4. The new location will now appear in your overview and comparison matrix.

---

## 5. Architecture & File Locations

SkillDesk has **zero database dependencies**. Everything is read and written directly to standard Markdown files and directories:

| Component | Location | Description |
| :--- | :--- | :--- |
| **Claude Code Skills** | `~/.claude/skills/` | Claude Code CLI global skills |
| **OpenCode Skills** | `~/.config/opencode/skills/` | OpenCode interpreter skills |
| **Cursor Skills** | `~/.cursor/skills-cursor/` | Cursor IDE agent skills |
| **Codex System Skills** | `~/.codex/skills/.system/` | OpenAI Codex system agent skills |
| **Antigravity Built-in** | `~/.gemini/antigravity/builtin/skills/` | Google Antigravity bundled skills |
| **Shared Agent Hub** | `~/.agents/skills/` | Canonical shared skill repository |
| **Settings File** | `~/.config/skills-manager/settings.json` | Custom paths & preferences |
| **Trash Location** | `~/.Trash/` | Safely deleted skills (never hard-deleted) |

---

## 6. Troubleshooting & FAQ

#### Q: The browser shows `http proxy error: /api/skills ECONNREFUSED`
**Fix:** The backend server was not running. Make sure you run `npm run dev` (which starts both backend on `:3001` and frontend on `:5173`), or start the backend in a separate terminal via `npm run server`.

#### Q: How do I change the port in Docker?
**Fix:** Run `./run-docker.sh 8080` or `PORT=8080 docker compose up -d`.

#### Q: What happens when I edit a symlinked skill?
**Fix:** Because symlinks point directly to the canonical file (typically in `~/.agents/skills`), editing the skill in SkillDesk updates the canonical file on disk, which means all assistants using that skill are immediately updated without divergence!

#### Q: Is it safe to delete a skill?
**Fix:** Yes! If the skill is a symlink, removing it only removes the link—the canonical files in your Shared Hub remain untouched. If it's a physical folder, SkillDesk moves it safely to macOS `~/.Trash` rather than permanently deleting it.
