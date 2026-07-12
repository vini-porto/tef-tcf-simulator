# TEF/TCF Canada Simulator (Unofficial)

> ⚠️ This is an **independent, unofficial** project, with no affiliation to CCIP (Chambre de Commerce et d'Industrie de Paris Île-de-France), France Éducation International, IRCC, or the Canadian government. All practice content is original and does not reproduce real exam questions.

Open-source simulator for the **TEF Canada** and **TCF Canada** French proficiency exams, used in Canadian immigration processes (Express Entry, PNP, citizenship). The project aims to closely replicate the format, timing, and structure of the real exams, offering an estimated level (NCLC/CLB) via AI-assisted scoring.

## Status

🚧 Under development — Phase 1 (writing expression) in progress.

## Why this project exists

Free, realistic practice tools for TEF/TCF are scarce, especially in a digital format faithful to the real exam. This project aims to fill that gap in an open, collaborative way.

## How it works

- Choose your exam (TEF or TCF) and take the writing section under simulated conditions: timed, no dictionary, no going back once you move forward.
- At the end, an AI model scores your writing based on the real evaluation criteria (linguistic, pragmatic, sociolinguistic) and estimates your NCLC/CLB level.
- **The score is an educational estimate, not an official evaluation.**

## Stack

Next.js · TypeScript · Prisma · Anthropic API (Claude)

## Contributing

The easiest way to contribute is by adding new practice prompts under `/content` — see `docs/data-schema.md` for the expected `PromptItem` format. All content must be original (CC-BY-SA license).

## License

- Code: [MIT](./LICENSE)
- Content (`/content`): CC-BY-SA — see `CONTENT_LICENSE.md`
