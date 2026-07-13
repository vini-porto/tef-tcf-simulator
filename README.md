# TEF/TCF Canada Simulator (Unofficial)

> This is an **independent, unofficial** project, with no affiliation to CCIP (Chambre de Commerce et d'Industrie de Paris Île-de-France), France Éducation International, IRCC, or the Canadian government. All practice content is original and does not reproduce real exam questions.

Open-source simulator for the **TEF Canada** and **TCF Canada** French proficiency exams, used in Canadian immigration processes (Express Entry, PNP, citizenship). The project aims to closely replicate the format, timing, and structure of the real exams, offering an estimated level (NCLC/CLB) via AI-assisted scoring.

## Status

Under development — Phase 1 (writing expression) in progress.

## Why this project exists

Free, realistic practice tools for TEF/TCF are scarce, especially in a digital format faithful to the real exam. This project aims to fill that gap in an open, collaborative way.

## How it works

- Choose your exam (TEF or TCF) and take the writing section under simulated conditions: timed, no dictionary, no going back once you move forward.
- At the end, an AI model scores your writing based on the real evaluation criteria (linguistic, pragmatic, sociolinguistic) and estimates your NCLC/CLB level.
- **The score is an educational estimate, not an official evaluation.**

## Stack

Next.js · TypeScript · Prisma · pluggable AI scoring (Anthropic Claude or Google Gemini)

## Getting started

```bash
npm install
cp .env.example .env.local   # then set AI_PROVIDER and the matching API key
npx prisma db push           # creates the local SQLite dev.db
npm run dev
```

Open http://localhost:3000, pick an exam and target level, and complete the writing
section.

### Choosing an AI provider

Scoring goes through a pluggable provider (`src/lib/ai`), picked via the `AI_PROVIDER`
env var:

| `AI_PROVIDER` | Needs | Notes |
| --- | --- | --- |
| `anthropic` (default) | `ANTHROPIC_API_KEY` | `ANTHROPIC_SCORING_MODEL` optional, defaults to `claude-opus-4-8` |
| `gemini` | `GEMINI_API_KEY` | Free tier via [Google AI Studio](https://aistudio.google.com/apikey). `GEMINI_SCORING_MODEL` optional, defaults to `gemini-flash-latest` (an auto-updating alias, since Google retires dated model names quickly) |
| `ollama` | A running [Ollama](https://ollama.com) instance | No API key, runs fully locally/offline. `OLLAMA_BASE_URL` optional, defaults to `http://localhost:11434`. `OLLAMA_SCORING_MODEL` optional, defaults to `llama3.1` — pull it first with `ollama pull llama3.1`. Use a model that supports structured JSON output for reliable scoring. |

Only the selected provider's key is required. Adding another provider means
implementing the small `ScoringProvider` interface in `src/lib/ai/` and
registering it in `src/lib/ai/index.ts`.

## Contributing

The easiest way to contribute is by adding new practice prompts under `/content` — see `docs/data-schema.md` for the expected `PromptItem` format. All content must be original (CC-BY-SA license).

## License

- Code: [MIT](./LICENSE)
- Content (`/content`): CC-BY-SA — see `CONTENT_LICENSE.md`
