# Workflows

This project uses **Claude Code Tasks** for workflow management.

## Task Workflow

### Starting Work

1. Read `CLAUDE.md` and `AGENTS.md` for project context
2. Use `TaskCreate` to break down work into trackable tasks
3. Use `TaskUpdate` to set task status to `in_progress` when starting
4. Use `TaskUpdate` to set task status to `completed` when done
5. Use `TaskList` to see all tasks and find next work

### Task Lifecycle

```
pending → in_progress → completed
```

- **pending**: Task created, not yet started
- **in_progress**: Actively working on task
- **completed**: Task finished and verified

### Task Best Practices

- Create tasks for non-trivial work (3+ steps)
- Mark tasks `in_progress` BEFORE starting work
- Only mark `completed` when fully verified (tests pass, lint clean)
- Use task dependencies (`addBlockedBy`) for sequential work
- Prefer working on tasks in ID order (lowest first)

## Quality Gates

Before marking work complete:

1. Run `npm run lint` - must pass
2. Run `npx tsc --noEmit` - must pass
3. Run `npm test` - must pass (when tests exist)
4. Test locally if UI changes

## Commit Conventions

- Run lint before committing
- Write clear commit messages describing the "why"
- Don't commit `.env.local` or API keys

## PR Conventions

- Create PRs against `main` branch
- Include summary of changes
- Include test plan or verification steps
