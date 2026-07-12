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
- **Writing scoring**: call to the Anthropic API (Claude) with an explicit scoring rubric in the system prompt

## Data architecture

The full data schema lives in [`docs/data-schema.md`](./docs/data-schema.md). Read it before creating any Prisma model or TypeScript type — the entities and relationships are already defined there. Summary of the two layers:

- **Static content** (`ExamDefinition`, `ExamSection`, `TaskTemplate`, `PromptItem`, `MCQQuestion`, `CLBConversionTable`) → `.json` files under `/content/{examType}/{sectionType}/`, versioned in git.
- **User data** (`User`, `ExamAttempt`, `SectionAttempt`, `TaskSubmission`, `ScoringResult`, `ContentContribution`) → Prisma tables.

## Structural difference TEF vs TCF (critical for the engine)

- **TCF Canada — Expression Écrite**: 3 tasks, 60 min total (short message ~10min / narrative ~20min / synthesis+opinion ~30min)
- **TEF Canada — Expression Écrite**: 2 tasks, 60 min total (short message ~20min / argumentative essay ~40min)

The simulation engine must be **configurable per `TaskTemplate`**, never hardcoded to a fixed number of tasks. TEF and TCF share ~80% of the logic (timer, editor, word counter, no-backtrack navigation); the difference lives entirely in the JSON config.

## MVP scope (Phase 1)

Build **only** the writing section, for both exams, with:
- [ ] Exam selection (TEF or TCF) and target level
- [ ] Draw an approved `PromptItem` matching the target level
- [ ] Editor with non-pausable timer, word counter, no backward navigation
- [ ] Submission creates a `TaskSubmission`
- [ ] Call to the Claude API to generate a `ScoringResult` (linguistic/pragmatic/sociolinguistic subscores + estimated NCLC + qualitative feedback)
- [ ] Results screen with visible disclaimer

**Out of scope for now** (future phases): listening/reading comprehension (MCQ), speaking (audio), full user accounts, progress history.

## Roadmap

1. **Phase 1** (current): writing expression, TEF + TCF, AI-assisted scoring
2. **Phase 2**: listening/reading comprehension (multiple-choice question bank)
3. **Phase 3**: speaking expression (audio recording + transcription + scoring) — save for last, it's the most complex

## Conventions

- Commits in English.
- UI copy for exam content should stay in French (it's the exam's language); navigation/interface labels in English.
- Every new `PromptItem`/`MCQQuestion` contributed via PR must start with `reviewStatus: "draft"` until reviewed by a maintainer.
- Never commit API keys — use `.env.local` (already in `.gitignore`).
