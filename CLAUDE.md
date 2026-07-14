# CLAUDE.md — Project Instructions

This file guides any Claude Code session working on this repository. Read it before generating any code.

## What this project is

An open-source, **unofficial** simulator for the TEF Canada and TCF Canada French proficiency exams, used in Canadian federal (Express Entry) and provincial immigration processes. The goal is to let candidates practice in an environment as close as possible to the real one (timing, format, task types) and receive an estimated level (NCLC/CLB) via AI-assisted scoring.

Code is MIT licensed. Content (prompts, questions) is CC-BY-SA, versioned separately under `/content`.

## Non-negotiable constraints (read before coding)

1. **Never reproduce real TEF/TCF questions or texts**, even if "leaked" or found on forums. All content under `/content` must be original, generated specifically for this project.
2. **Never imply official affiliation.** Project name, README, app screens — everything must make clear this is an independent simulation, with no ties to CCIP, France Éducation International, or the Canadian government.
3. Every scoring result shown to the user must include the disclaimer: *"Unofficial estimate. Does not replace the official exam evaluation."*
4. Do not use the "TEF Canada" or "TCF Canada" marks in a way that suggests an official product (fine to use them descriptively, e.g. "unofficial TEF Canada simulator").

## Tech stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: React, Tailwind
- **Content data**: static JSON files under `/content`, no database
- **User data**: Prisma + SQLite in dev / Postgres in production
- **Writing scoring**: pluggable AI provider (`src/lib/ai`), selected via `AI_PROVIDER` env var (`anthropic` | `gemini` | `ollama` | `openai`), each sending the same explicit scoring rubric and returning structured JSON. `ollama` runs fully locally (no API key, no data leaves the machine) for users who prefer not to send submissions to a third-party API.

## Data architecture

The full data schema lives in [`docs/data-schema.md`](./docs/data-schema.md). Read it before creating any Prisma model or TypeScript type — the entities and relationships are already defined there. Summary of the two layers:

- **Static content** (`ExamDefinition`, `ExamSection`, `TaskTemplate`, `PromptItem`, `MCQQuestion`, `CLBConversionTable`) → `.json` files under `/content/{examType}/{sectionType}/`, versioned in git.
- **User data** (`User`, `ExamAttempt`, `SectionAttempt`, `TaskSubmission`, `ScoringResult`, `ContentContribution`) → Prisma tables.
- **Local-only client state** (anonymous user id, per-attempt progress, one-time UI flags like "has seen the onboarding walkthrough") → browser `localStorage`/`sessionStorage` via `src/lib/client-state.ts`, never the DB. This keeps Phase 1 login-free per the "no full user accounts yet" scope below; prefer this pattern over a Prisma migration for anything that's purely a per-browser UX flag.
- **Listening audio is generated on demand, never committed.** `content/{examType}/comprehension_orale/questions.json` stores each `MCQQuestion`'s `dialogueScript` (who says what, in which voice) as the versioned source of truth. Running `npm run generate:audio` (wraps `scripts/generate_audio.py`, uses [pocket-tts](https://github.com/kyutai-labs/pocket-tts)) synthesizes the actual `.wav` files into `public/audio/`, which is gitignored. The app and its content are fully valid without ever running that script — only playback needs the generated files. Don't commit anything under `public/audio/`.

### Combined multi-section exam attempt

An `ExamAttempt` now runs every section listed in `ExamDefinition.sections`, in order, back-to-back within one attempt — not a single isolated section. `SectionAttempt` rows are created lazily (one per section, when the learner reaches it), same no-backtrack-friendly pattern the per-task flow already used in Phase 1. `src/lib/attempt-engine.ts`'s `finishTaskAndAdvance(sectionAttemptId)` is the single place that decides whether a section is complete, computes its `sectionEstimatedNclc`, and returns the next section (or marks the whole `ExamAttempt` `completed` with an `overallEstimatedNclc` once the last section finishes). Both submission endpoints (`app/api/submissions`, `app/api/mcq-submissions`) call into it — don't duplicate that logic inline in a route handler.

Routing reflects this: task pages live at `app/attempt/[attemptId]/section/[sectionId]/task/[order]/page.tsx`, so task numbering resets per section instead of being a flat global counter. `src/lib/client-state.ts`'s `AttemptState` carries `sectionOrder`/`currentSectionId` plus per-section-scoped fields (`tasks`, `completedTaskIds`, `taskStartedAt`, etc.) that get reset via `advanceToSection()` when the client moves to the next section.

## Structural difference TEF vs TCF (critical for the engine)

- **TCF Canada — Expression Écrite**: 3 tasks, 60 min total (short message ~10min / narrative ~20min / synthesis+opinion ~30min)
- **TEF Canada — Expression Écrite**: 2 tasks, 60 min total (short message ~20min / argumentative essay ~40min)
- **Compréhension Orale (TEF + TCF)**: 6 `listening_mcq` tasks, one `MCQQuestion` (2+ speaker dialogue, multiple choice) drawn per task, auto-scored (no AI call) via `method: "mcq_auto"`, correct-count banded to NCLC through `CLBConversionTable`. Both exams open with this section, followed by Expression Écrite — see `ExamDefinition.sections` order.

The simulation engine must be **configurable per `TaskTemplate`**, never hardcoded to a fixed number of tasks. TEF and TCF share ~80% of the logic (timer, no-backtrack navigation); task-type-specific rendering (writing editor+word counter vs. listening audio+choices) lives in separate view components (`src/components/WritingTaskView.tsx`, `src/components/ListeningTaskView.tsx`) behind a shared chrome — the difference otherwise lives entirely in the JSON config.

## MVP scope (Phase 1)

Build **only** the writing section, for both exams, with:
- [x] Exam selection (TEF or TCF) and target level
- [x] Draw an approved `PromptItem` matching the target level
- [x] Editor with non-pausable timer, word counter, no backward navigation
- [x] Submission creates a `TaskSubmission`
- [x] Call to the Claude API to generate a `ScoringResult` (linguistic/pragmatic/sociolinguistic subscores + estimated NCLC + qualitative feedback)
- [x] Results screen with visible disclaimer
- [x] Optional first-time walkthrough explaining the exam format, shown once before a user's first attempt, skippable

## Phase 2 scope (listening comprehension)

- [x] `listening_mcq` task type + `MCQQuestion`/`DialogueTurn` content types
- [x] Original `comprehension_orale` content (6 questions each, TEF + TCF), audio generated on demand via pocket-tts, never committed
- [x] Combined multi-section exam attempt (listening → writing, back-to-back, matching real exam order)
- [x] Auto-scored MCQ submissions, per-section + overall NCLC estimates
- [ ] Reading comprehension (`comprehension_ecrite`) — same MCQ engine, no audio, natural fast-follow

**Out of scope for now** (future phase): speaking (audio recording + transcription + scoring), full user accounts, progress history.

## Roadmap

1. **Phase 1**: writing expression, TEF + TCF, AI-assisted scoring — done
2. **Phase 2** (current): listening comprehension shipped; reading comprehension still pending within this phase
3. **Phase 3**: speaking expression (audio recording + transcription + scoring) — save for last, it's the most complex

## Conventions

- Commits in English.
- UI copy for exam content should stay in French (it's the exam's language); navigation/interface labels in English.
- Every new `PromptItem`/`MCQQuestion` contributed via PR must start with `reviewStatus: "draft"` until reviewed by a maintainer.
- Never commit API keys — use `.env.local` (already in `.gitignore`).
