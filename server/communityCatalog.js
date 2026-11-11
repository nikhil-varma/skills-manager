/**
 * Curated Community Agent Skills Catalog
 * Verified Anthropic / AgentOS specification compliant skills
 */

export const COMMUNITY_SKILLS = [
  {
    id: 'git-commit-sage',
    name: 'git-commit-sage',
    displayName: 'Git Commit Sage',
    category: 'Git & Workflow',
    author: 'agentos-community',
    version: '1.2.0',
    tags: ['git', 'commit', 'conventional-commits', 'productivity'],
    description: 'Generates concise, conventional commit messages (feat, fix, refactor, docs) by inspecting staged diffs and branch context.',
    skillContent: `---
name: git-commit-sage
description: Generates concise, conventional commit messages from git diffs with semantic prefixes and clear reasoning.
metadata:
  version: "1.2.0"
  author: "agentos-community"
  category: "Git & Workflow"
---

# Git Commit Sage

Analyze staged or recent git changes and craft professional, standardized commit messages following the Conventional Commits specification.

## Core Rules

1. Format: \`<type>(<scope>): <short summary in imperative mood>\`
2. Types:
   - \`feat\`: New user-facing feature
   - \`fix\`: Bug fix
   - \`refactor\`: Code change without behavioral change
   - \`perf\`: Performance enhancement
   - \`test\`: Adding or correcting tests
   - \`docs\`: Documentation updates
   - \`chore\`: Build tools, dependencies, or auxiliary tasks
3. Subject line: Maximum 72 characters, lowercase, no ending period.
4. Body (when needed): Explain *why* the change was made, not just *what*.

## Usage Example

\`\`\`bash
# When staged changes exist:
git diff --staged
# Produces:
feat(auth): add OAuth2 refresh token auto-rotation
\`\`\`
`
  },
  {
    id: 'pr-review-expert',
    name: 'pr-review-expert',
    displayName: 'PR Review Expert',
    category: 'Git & Workflow',
    author: 'anthropic-engineering',
    version: '2.0.0',
    tags: ['code-review', 'github', 'security', 'quality'],
    description: 'Thorough, empathetic code review assistant analyzing architectural integrity, security pitfalls, edge cases, and test coverage.',
    skillContent: `---
name: pr-review-expert
description: Comprehensive multi-perspective pull request code reviewer covering architectural fit, security risks, performance, and clean code.
metadata:
  version: "2.0.0"
  author: "anthropic-engineering"
  category: "Git & Workflow"
---

# PR Review Expert

Conduct balanced, actionable, and constructive code reviews for pull requests.

## Review Pillars

1. **Architecture & Design**: Does this change fit existing patterns? Are responsibilities cleanly decoupled?
2. **Security & Validation**: Are inputs sanitized? Are tokens or sensitive headers leaked?
3. **Performance**: Any accidental N+1 queries, unindexed filters, or quadratic loops?
4. **Resilience & Errors**: Are error states handled cleanly? Does it fail gracefully?
5. **Testing**: Are edge cases, empty states, and failures verified?

## Review Output Format

- **Summary**: High-level overview of the pull request intent and quality.
- **Critical / Blocker Issues**: Bugs or vulnerabilities requiring fixes before merge.
- **Suggestions & Polish**: Non-blocking improvements for maintainability.
- **Praise**: Commend notable clean implementations or thorough tests.
`
  },
  {
    id: 'unit-test-synthesizer',
    name: 'unit-test-synthesizer',
    displayName: 'Unit Test Synthesizer',
    category: 'Testing & QA',
    author: 'agentos-community',
    version: '1.3.0',
    tags: ['testing', 'jest', 'vitest', 'pytest', 'tdd'],
    description: 'Generates robust unit and integration tests with happy paths, boundary values, error states, and mock fixtures.',
    skillContent: `---
name: unit-test-synthesizer
description: Generates comprehensive unit and integration tests with edge cases, mocking strategies, and high branch coverage.
metadata:
  version: "1.3.0"
  author: "agentos-community"
  category: "Testing & QA"
---

# Unit Test Synthesizer

Generate robust, maintainable test suites for TypeScript, JavaScript, Python, or Go codebases.

## Testing Guidelines

1. **Arrange-Act-Assert (AAA)** pattern must be explicitly visible.
2. **Boundary Conditions**: Test null, undefined, empty array/object, zero, maximum integer, and oversized payloads.
3. **Failure Isolation**: Each test must assert only one primary behavior.
4. **Mocking**: Mock external network calls, file system I/O, and system clock; avoid over-mocking internal pure functions.
5. **Readable Spec Names**: Use descriptive titles like \`it('should reject expired tokens with 401 Unauthorized')\`.
`
  },
  {
    id: 'security-vulnerability-auditor',
    name: 'security-vulnerability-auditor',
    displayName: 'Security Vulnerability Auditor',
    category: 'Security & Auditing',
    author: 'devsecops-guild',
    version: '1.4.0',
    tags: ['security', 'owasp', 'audit', 'secrets', 'cve'],
    description: 'Scans source code and configs for OWASP Top 10 vulnerabilities, hardcoded secrets, injection vectors, and insecure dependencies.',
    skillContent: `---
name: security-vulnerability-auditor
description: Scans source code and configurations for OWASP Top 10 vulnerabilities, credential leaks, and insecure data handling.
metadata:
  version: "1.4.0"
  author: "devsecops-guild"
  category: "Security & Auditing"
---

# Security Vulnerability Auditor

Identify security flaws, privilege escalation hazards, and unintended credential exposure in application source code.

## Audit Checklist

- **Secrets & API Keys**: Verify no unencrypted tokens, private keys, or passwords in repository or git history.
- **Injection Vectors**: Check SQL queries, raw HTML rendering (XSS), command execution (eval, child_process), and template injection.
- **Authentication & Sessions**: Inspect cookie flags (\`HttpOnly\`, \`Secure\`, \`SameSite\`), JWT expiration, and CSRF protection.
- **Access Control (IDOR)**: Ensure tenant/user IDs are verified server-side on every mutate operation.
- **Dependencies**: Flag known vulnerable packages and unpinned dependencies.
`
  },
  {
    id: 'docker-compose-architect',
    name: 'docker-compose-architect',
    displayName: 'Docker Compose Architect',
    category: 'DevOps & Cloud',
    author: 'cloud-native-tools',
    version: '1.1.0',
    tags: ['docker', 'devops', 'containers', 'infrastructure'],
    description: 'Creates production-grade, multi-container Docker Compose architectures with healthchecks, persistent volumes, and isolated networks.',
    skillContent: `---
name: docker-compose-architect
description: Designs optimized, multi-service Docker Compose setups with network segregation, healthchecks, and volume management.
metadata:
  version: "1.1.0"
  author: "cloud-native-tools"
  category: "DevOps & Cloud"
---

# Docker Compose Architect

Craft clean, production-ready, and developer-friendly Docker Compose files.

## Architectural Best Practices

1. **Network Segregation**: Separate internal database networks from public-facing reverse proxies.
2. **Healthchecks**: Add explicit \`healthcheck\` directives for databases (e.g. \`pg_isready\`) with \`depends_on.condition: service_healthy\`.
3. **Persistent Volumes**: Name named volumes explicitly for database directories to prevent data loss.
4. **Environment Variables**: Use \`.env\` files with sane defaults and \`.env.example\` documentation.
5. **Resource Limits**: Define CPU and memory reservations for memory-heavy services.
`
  },
  {
    id: 'database-migration-helper',
    name: 'database-migration-helper',
    displayName: 'Database Migration Helper',
    category: 'DevOps & Cloud',
    author: 'data-eng-core',
    version: '1.2.0',
    tags: ['sql', 'postgres', 'prisma', 'migrations', 'database'],
    description: 'Plans zero-downtime database migrations, detects dangerous table locks, and optimizes query indexes.',
    skillContent: `---
name: database-migration-helper
description: Plans safe, zero-downtime schema migrations, analyzes table locks, and recommends optimal compound indexes.
metadata:
  version: "1.2.0"
  author: "data-eng-core"
  category: "DevOps & Cloud"
---

# Database Migration Helper

Design zero-downtime, backwards-compatible relational database migrations.

## Safe Migration Strategy (Expand & Contract)

1. **Step 1 (Expand)**: Add the new column/table as nullable or with a non-blocking default. Deploy backend code that writes to both old and new columns.
2. **Step 2 (Backfill)**: Run an asynchronous batch backfill script without locking production tables.
3. **Step 3 (Switch)**: Deploy backend code reading from the new column.
4. **Step 4 (Contract)**: Remove old column in a subsequent release.

## Lock Prevention

- Never add a \`NOT NULL\` column without a default in PostgreSQL < 11.
- Always create indexes concurrently (\`CREATE INDEX CONCURRENTLY\`).
- Set low lock timeouts (\`SET lock_timeout = '2s'\`) for DDL operations.
`
  },
  {
    id: 'tailwind-theme-craft',
    name: 'tailwind-theme-craft',
    displayName: 'Tailwind Theme Craft',
    category: 'Frontend & UI',
    author: 'ui-guild',
    version: '1.5.0',
    tags: ['tailwind', 'css', 'design-system', 'dark-mode'],
    description: 'Generates cohesive design tokens, harmonious semantic color scales, dark mode support, and WCAG AAA compliant contrast.',
    skillContent: `---
name: tailwind-theme-craft
description: Generates modern design system tokens, accessible color palettes, and Tailwind v4 themes with seamless dark mode.
metadata:
  version: "1.5.0"
  author: "ui-guild"
  category: "Frontend & UI"
---

# Tailwind Theme Craft

Build accessible, beautiful, and consistent Tailwind CSS themes and UI component styles.

## Design System Principles

1. **Semantic Color Tokens**: Never hardcode hex values inside components; use semantic slots like \`bg-background\`, \`text-foreground\`, \`border-border\`.
2. **Accessible Contrast**: Ensure all text passes WCAG 2.1 AA (4.5:1 ratio) and AAA where possible.
3. **Frosted Glass & Materials**: Utilize backdrop blur (\`backdrop-blur-md\`), subtle borders (\`border-white/10\`), and soft ambient shadows.
4. **Responsive Fluid Typography**: Scale gracefully between mobile and desktop viewports.
`
  },
  {
    id: 'react-component-refactor',
    name: 'react-component-refactor',
    displayName: 'React Component Refactor',
    category: 'Frontend & UI',
    author: 'frontend-masters',
    version: '1.2.0',
    tags: ['react', 'typescript', 'refactoring', 'clean-code'],
    description: 'Refactors bloated React components into clean, decomposed subcomponents, custom hooks, and memoized pure functions.',
    skillContent: `---
name: react-component-refactor
description: Decomposes oversized React components into focused custom hooks, presenter components, and accessible state machines.
metadata:
  version: "1.2.0"
  author: "frontend-masters"
  category: "Frontend & UI"
---

# React Component Refactor

Break down monolithic React components into maintainable, composable pieces.

## Refactoring Rules

1. **Single Responsibility**: A component should either manage data fetching/state orchestration OR render UI, rarely both.
2. **Extract Custom Hooks**: Any logic involving more than two related \`useState\` / \`useEffect\` calls belongs in a dedicated \`useX\` hook.
3. **Compound Components**: For complex UI widgets (Dropdown, Modal, Tabs), use compound component patterns or slot children.
4. **Avoid Premature Memoization**: Only use \`useMemo\` and \`useCallback\` when measuring actual re-render bottlenecks or passing callbacks to memoized children.
`
  },
  {
    id: 'api-contract-validator',
    name: 'api-contract-validator',
    displayName: 'API Contract Validator',
    category: 'Testing & QA',
    author: 'api-platform-team',
    version: '1.1.0',
    tags: ['api', 'openapi', 'rest', 'contract-testing'],
    description: 'Validates REST endpoints against OpenAPI 3.1 specifications, ensuring strict request/response schema conformity.',
    skillContent: `---
name: api-contract-validator
description: Verifies REST and GraphQL APIs against OpenAPI/JSON schema contracts to prevent breaking changes and drift.
metadata:
  version: "1.1.0"
  author: "api-platform-team"
  category: "Testing & QA"
---

# API Contract Validator

Ensure API implementations strictly adhere to agreed OpenAPI or JSON schema contracts.

## Inspection Checklist

- **Status Code Accuracy**: Ensure 200, 201, 204, 400, 401, 403, 404, and 500 statuses return exact documented response shapes.
- **Required Fields**: Verify non-nullable properties are never returned as null or omitted.
- **Pagination Contracts**: Standardize cursor or page-based envelopes (\`items\`, \`nextCursor\`, \`hasMore\`).
- **Error Payloads**: Enforce RFC 7807 (Problem Details for HTTP APIs) or consistent structured errors.
`
  },
  {
    id: 'incident-postmortem-scribe',
    name: 'incident-postmortem-scribe',
    displayName: 'Incident Postmortem Scribe',
    category: 'Git & Workflow',
    author: 'sre-reliability-group',
    version: '1.0.0',
    tags: ['sre', 'devops', 'incident', 'postmortem'],
    description: 'Facilitates blameless post-mortem analysis with chronological timelines, Five-Whys root cause analysis, and preventative action items.',
    skillContent: `---
name: incident-postmortem-scribe
description: Guides blameless incident post-mortem documentation with Five-Whys root cause analysis and preventative action items.
metadata:
  version: "1.0.0"
  author: "sre-reliability-group"
  category: "Git & Workflow"
---

# Incident Postmortem Scribe

Draft rigorous, blameless post-incident reviews to build organizational resilience.

## Document Structure

1. **Incident Metadata**: Severity, Start Time, Detection Time, Resolution Time, Total Impact Duration.
2. **User Impact**: Quantitative metrics (e.g. percentage of API requests dropped, affected customers).
3. **Incident Timeline**: Precise UTC timestamped log of alert firing, page out, triage actions, and mitigation.
4. **Root Cause Analysis (5 Whys)**: Progressive deeper investigation without placing personal blame.
5. **Action Items (SMART)**: Concrete preventative engineering tasks with owners and target milestones.
`
  }
];
