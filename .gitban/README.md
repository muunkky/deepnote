# gitban — the board behind this work, in git

This folder is a **[gitban](https://github.com/muunkky/gitban-mcp)** board: an agile board for AI agents and humans that lives entirely in version control. Cards, sprints, and a roadmap are plain Markdown/YAML; every state change is a file rename; every sprint archive is a folder you can `grep`. An MCP server drives it, and a set of specialized agents — sprint-architect, executor, reviewer, router, planner, dispatcher — plan, build, **adversarially review**, and close out the work.

You're most likely reading this from a showcase PR. Here's the map.

## What's worth opening

| Path                                           | What it is                                                                                                                                                                              |
| :--------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`roadmap/roadmap.yaml`](roadmap/roadmap.yaml) | The strategic tree — milestones → stories → projects → features.                                                                                                                        |
| [`views/roadmap.html`](views/roadmap.html)     | A self-contained rendered view of that roadmap.                                                                                                                                         |
| [`cards/`](cards/)                             | The work cards. Each carries its own root-cause analysis, Definition of Done with an unfakeable capstone, TDD plan, and close-out notes. Completed sprints live under `cards/archive/`. |
| [`agents/`](agents/)                           | **The harness trail.** What each agent actually did, as readable artifacts.                                                                                                             |

## How the harness produces a change

```
sprint-architect → executor → reviewer → router → closeout
   (scopes one        (writes the    (independent    (turns the    (archives, flips
    card + DoD +       fix TDD-first,  adversarial     review into   the roadmap,
    capstone)          worktree-       2-gate review,  a verdict)    runs Gate 0)
                       isolated)       re-runs tests)
```

The load-bearing step is the **reviewer**: an independent agent that adversarially checks both whether the completion claim is honest (Gate 1) and whether the implementation is actually sound (Gate 2) — _before_ anything ships. The **planner** only appears when a review surfaces follow-up work to route; a clean change produces no planner artifact, and that absence is expected.

You can read the full trail for the change this board shipped in [`agents/dispatcher/inbox/`](agents/dispatcher/inbox/) (the dispatch log + Gate 0 record), alongside the per-agent [executor](agents/executor/inbox/), [reviewer](agents/reviewer/inbox/), and [router](agents/router/inbox/) artifacts.

## Honest framing

The point isn't "AI that never makes mistakes." It's a loop where an **independent adversarial reviewer gates every change before it ships**, and where the reasoning — why this fix, what was tested, what was deferred — is captured as durable, version-controlled artifacts instead of evaporating in a chat log.

_This is a curated showcase: the reusable scaffold (templates, hooks, MCP setup) has been trimmed so only the interesting assets remain._
