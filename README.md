# SkillDesk ⚡

An elegant macOS app to discover, inspect, and manage AI Agent skills across all your assistants (**Claude Code**, **OpenCode**, **Antigravity**, and **Shared Hub**).

## Features

- **🔍 Automatic macOS Discovery**: Scans `~/.claude/skills`, `~/.config/opencode/skills`, `~/.gemini/antigravity/skills`, and `~/.agents/skills` on startup.
- **📊 Unified Matrix & Catalog**: View all installed skills side-by-side. See instantly which assistant has which skill, and which are symlinked to shared canonical storage.
- **🔄 Instant Transfer & Sync**:
  - **Symlink (Share)**: Link a skill from Claude to OpenCode (or vice-versa) using `~/.agents/skills` as the shared hub to prevent drift.
  - **Copy**: Duplicate an independent copy into another assistant.
  - **Move**: Transfer skills between platforms.
  - **Sync to All**: Enable a skill across every coding assistant with one click.
- **📝 Live SKILL.md Inspector & Editor**: View rendered Markdown instructions, parse frontmatter metadata, and edit directly with immediate disk updates.
- **📁 File Explorer & macOS Finder**: Browse contained scripts and assets, and reveal any skill folder in macOS Finder.
- **➕ New Skill Generator**: Scaffold new skills with standard YAML frontmatter template and optional multi-assistant auto-linking.

---

## Quick Start

### 1. Run with Docker (Share with Anyone — Zero Setup)
Anyone on Mac or Linux with Docker installed can run SkillDesk with a single command:

```bash
docker compose up -d
```
or simply:
```bash
./run-docker.sh
```

Then open **http://localhost:3001** in your browser.

> **How Docker shares with your host:** The `docker-compose.yml` mounts `${HOME}:/host_home:rw`, allowing the container to scan, read, create, copy, and symlink skills across your actual host machine!

---

### 2. Local Development Mode (Node.js)
Runs the backend API (`:3001`) and Vite frontend (`:5173`) with hot module reloading:

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

---

### 3. Native macOS Desktop App (Tauri)
Run SkillDesk directly as a native macOS Sequoia desktop application with native window vibrancy and traffic light integration:

```bash
# Run in desktop development mode (launches Vite, Node server, and native window)
npm run tauri:dev

# Or build the native macOS .app / DMG bundle
npm run tauri:build
```

---

### 4. Standalone / Production Mode
Serves both backend API and frontend from a single port:

```bash
npm start
```

Then open [http://localhost:3001](http://localhost:3001).

---

## Default Skill Locations Scanned

| Assistant / Store | Path |
| :--- | :--- |
| **Claude Code** | `~/.claude/skills` |
| **OpenCode** | `~/.config/opencode/skills` |
| **Antigravity Custom** | `~/.gemini/antigravity/skills` |
| **Antigravity Built-in** | `~/.gemini/antigravity/builtin/skills` |
| **Shared Hub** | `~/.agents/skills` |

You can also add any custom workspace repo paths directly from the **Settings** modal in the UI.
