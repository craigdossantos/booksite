# Agent Files - Wiring Notes

This directory contains configuration and memory files for AI coding agents.

## File Roles

| File              | Purpose                                        | Loaded By                   |
| ----------------- | ---------------------------------------------- | --------------------------- |
| `CONSTITUTION.md` | Tool-agnostic constitution (mirrors CLAUDE.md) | Codex, Gemini, other agents |
| `WORKFLOWS.md`    | Workflow policy - MUST read before work        | All agents                  |
| `MEMORY.md`       | Append-only learnings                          | Selectively loaded          |
| `LEARNINGS.md`    | Distilled/promoted learnings                   | Selectively loaded          |
| `README.md`       | This file - wiring documentation               | Reference only              |

## Root-Level Files

| File         | Purpose                            | Loaded By            |
| ------------ | ---------------------------------- | -------------------- |
| `/CLAUDE.md` | Constitution for Claude Code       | Claude Code (always) |
| `/AGENTS.md` | Open-standard agent guidance entry | All agents           |

## Agent-Specific Wiring

### Claude Code

- **Always loads**: `/CLAUDE.md`
- **Must read**: `/agent/WORKFLOWS.md` (per invariant in CLAUDE.md)
- **Optional**: `/agent/MEMORY.md`, `/agent/LEARNINGS.md`

### Codex / Other Agents

- **Inject**: `/agent/CONSTITUTION.md` (equivalent to CLAUDE.md)
- **Must read**: `/agent/WORKFLOWS.md`
- **Retrieve selectively**: `/agent/MEMORY.md`, `/agent/LEARNINGS.md`

## Memory vs Learnings

- **MEMORY.md**: Append-only log of discoveries, gotchas, and context
  - Add with: `/agent-note` skill
  - Format: Dated entries with category tags

- **LEARNINGS.md**: Distilled, promoted insights from MEMORY.md
  - Promoted when patterns are confirmed
  - More stable, higher signal-to-noise

## Key Principle

AGENTS.md is **read-mostly guidance**, not a memory log. Don't add dated learnings to AGENTS.md - use MEMORY.md instead.
