# Data Schema — TEF/TCF Canada Simulator

> Architecture document. Defines the main entities, their fields, and how they relate. Designed for Next.js + TypeScript, with static content versioned as JSON and user data in a relational database (SQLite/Postgres via Prisma).

---

## Entity overview

```
ExamDefinition ──< ExamSection ──< TaskTemplate ──< PromptItem
                                        │
                                        │ (MCQ only)
                                        └──< MCQQuestion

User ──< ExamAttempt ──< SectionAttempt ──< TaskSubmission ──1─1── ScoringResult
                                                   │
                                                   └── references PromptItem / MCQQuestion

CLBConversionTable (static reference, used by ScoringResult)
ContentContribution (metadata for community PRs, linked to PromptItem/MCQQuestion)
```

Two clearly separated data layers:

- **Content (static, git-versioned, JSON)**: `ExamDefinition`, `ExamSection`, `TaskTemplate`, `PromptItem`, `MCQQuestion`, `CLBConversionTable`. This is what the community contributes via pull request — no database needed.
- **User data (dynamic, relational database)**: `User`, `ExamAttempt`, `SectionAttempt`, `TaskSubmission`, `ScoringResult`, `ContentContribution`.

---

## 1. Static content (versioned as JSON)

### `ExamDefinition`

Represents the "blueprint" of an entire exam.

```typescript
interface ExamDefinition {
  id: string;                    // "tef-canada" | "tcf-canada"
  examType: "TEF" | "TCF";
  displayName: string;           // "TEF Canada"
  version: string;               // "2026.1" — version format changes
  totalDurationMin: number;
  sections: ExamSection["id"][]; // official order of sections
  officialSource?: string;       // reference link (never protected content)
  disclaimer: string;            // fixed text: "unofficial simulation..."
}
```

### `ExamSection`

Each of the 4 competencies.

```typescript
type SectionType =
  | "comprehension_orale"   // listening, MCQ
  | "comprehension_ecrite"  // reading, MCQ
  | "expression_ecrite"     // writing, open-ended tasks
  | "expression_orale";     // speaking, open-ended tasks + audio

interface ExamSection {
  id: string;                    // "tcf-expression-ecrite"
  examId: ExamDefinition["id"];
  type: SectionType;
  durationMin: number;
  taskTemplateIds: string[];     // order of tasks within the section
  allowBacktrack: boolean;       // false — faithful to the real format
  toolsAllowed: {
    dictionary: boolean;         // always false in real exams
    spellcheck: boolean;         // always false
  };
}
```

### `TaskTemplate`

The "mold" of a task — not the question itself, but the rule behind it. This is where TEF and TCF structurally diverge (2 vs 3 writing tasks, for example).

```typescript
type TaskType =
  | "message"                  // typical task 1: short message
  | "narrative"                // recount/blog post
  | "argumentative_synthesis"  // synthesis of 2 documents + opinion
  | "argumentative_essay";     // argumentative essay (TEF task 2)

type Register = "tu" | "vous" | "either";

interface TaskTemplate {
  id: string;                  // "tcf-ee-task-1"
  sectionId: ExamSection["id"];
  order: number;                // 1, 2, 3...
  type: TaskType;
  durationMin: number;
  minWords: number;
  maxWords: number;
  register: Register;
  cecrLevelRange: [string, string]; // ["A2", "B1"] — expected task level
  instructionsTemplate: string; // fixed instruction text (generic, original, not copied)
  evaluationCriteria: string[]; // ["clarity", "coherence", "lexical richness", ...]
}
```

### `PromptItem`

A concrete theme/prompt instance filling a `TaskTemplate`. This is where the community contributes at scale.

```typescript
interface PromptItem {
  id: string;                   // uuid
  taskTemplateId: TaskTemplate["id"];
  cecrLevel: string;            // "B1"
  title: string;
  promptText: string;           // original prompt text, never copied from a real exam
  contextDocuments?: {          // used for the synthesis task (2 viewpoints)
    label: string;
    text: string;
  }[];
  tags: string[];                // ["immigration", "work", "daily life"]
  createdBy: "ai-generated" | "community" | "maintainer";
  reviewStatus: "draft" | "approved" | "flagged";
  contributionId?: ContentContribution["id"];
}
```

### `MCQQuestion`

For listening/reading comprehension.

```typescript
interface MCQQuestion {
  id: string;
  taskTemplateId: TaskTemplate["id"];
  cecrLevel: string;
  stimulusType: "text" | "audio";
  stimulusContent: string;       // text, or path/url of the audio
  questionText: string;
  choices: { id: string; text: string }[];
  correctChoiceId: string;
  createdBy: "ai-generated" | "community" | "maintainer";
  reviewStatus: "draft" | "approved" | "flagged";
}
```

### `CLBConversionTable`

Public reference table (official IRCC grids) to convert raw scores into NCLC/CLB.

```typescript
interface CLBConversionEntry {
  examType: "TEF" | "TCF";
  sectionType: SectionType;
  rawScoreMin: number;
  rawScoreMax: number;
  nclcLevel: number;   // 1-10+
  clbLevel: number;    // equivalent
}

type CLBConversionTable = CLBConversionEntry[];
```

---

## 2. User data (relational database)

### `User`

```typescript
interface User {
  id: string;
  displayName?: string;         // can be anonymous/local if no account is needed
  createdAt: string;            // ISO date
  targetExam?: "TEF" | "TCF" | "both";
  targetNclcGoal?: number;      // personal goal, e.g. 7
}
```

### `ExamAttempt`

A full (or partial) exam simulation.

```typescript
type AttemptStatus = "in_progress" | "completed" | "abandoned";

interface ExamAttempt {
  id: string;
  userId: User["id"];
  examId: ExamDefinition["id"];
  startedAt: string;
  finishedAt?: string;
  status: AttemptStatus;
  sectionAttemptIds: string[];
  overallEstimatedNclc?: number; // computed at the end, combining completed sections
}
```

### `SectionAttempt`

```typescript
interface SectionAttempt {
  id: string;
  examAttemptId: ExamAttempt["id"];
  sectionId: ExamSection["id"];
  startedAt: string;
  finishedAt?: string;
  taskSubmissionIds: string[];
  sectionEstimatedNclc?: number;
}
```

### `TaskSubmission`

The candidate's response to a specific task — the core of the writing/speaking simulation.

```typescript
interface TaskSubmission {
  id: string;
  sectionAttemptId: SectionAttempt["id"];
  taskTemplateId: TaskTemplate["id"];
  promptItemId?: PromptItem["id"];   // null for MCQ tasks
  mcqAnswers?: { questionId: string; selectedChoiceId: string }[];

  // fields specific to writing/speaking expression
  textResponse?: string;
  wordCount?: number;
  audioResponseUrl?: string;         // phase 3 (speaking)
  timeSpentSeconds: number;
  wordCountMet: boolean;             // if the minimum wasn't reached → "A1 not attained"
  submittedAt: string;

  scoringResultId?: ScoringResult["id"];
}
```

### `ScoringResult`

The scoring outcome — via AI, with full transparency about the method.

```typescript
interface ScoringResult {
  id: string;
  taskSubmissionId: TaskSubmission["id"];
  method: "ai_estimate" | "self_checklist" | "mcq_auto";
  modelUsed?: string;                // e.g. "claude-sonnet-5", null if not AI

  subscores: {
    linguistic: number;              // vocabulary, grammar, spelling (0-10)
    pragmatic: number;               // coherence, task adequacy (0-10)
    sociolinguistic?: number;        // tu/vous register, social adequacy (0-10)
  };

  estimatedNclc: number;
  confidence: "low" | "medium" | "high"; // the AI should self-assess this
  feedbackText: string;              // qualitative feedback in natural language
  strengthsHighlighted: string[];
  improvementAreas: string[];

  officialDisclaimer: string;        // fixed: "unofficial estimate..."
  scoredAt: string;
}
```

### `ContentContribution`

Tracks community contributions to prompts/questions — important for a healthy open-source project.

```typescript
interface ContentContribution {
  id: string;
  contributorHandle?: string;        // GitHub handle, optional
  pullRequestUrl?: string;
  itemType: "PromptItem" | "MCQQuestion";
  itemId: string;
  reviewedBy?: string;
  reviewedAt?: string;
  licenseAcknowledged: boolean;      // confirms the content is original (CC-BY-SA)
}
```

---

## 3. End-to-end flow of a writing task

1. An `ExamAttempt` is created for the `User` upon choosing TEF or TCF.
2. For each `TaskTemplate` in the `expression_ecrite` section, the system draws an `approved` `PromptItem` matching the user's target level.
3. The frontend renders the editor with a timer (`durationMin`), a word counter (`minWords`/`maxWords`), and no-backtrack navigation (`allowBacktrack: false`).
4. On submission, a `TaskSubmission` is created with `textResponse`, `wordCount`, `timeSpentSeconds`.
5. A job (or synchronous call) sends the text + the `TaskTemplate`'s `evaluationCriteria` to the model, which returns a `ScoringResult`.
6. Once all tasks in the section are done, `estimatedNclc` values are aggregated into `SectionAttempt.sectionEstimatedNclc`.
7. At the end of the full exam, everything is aggregated into `ExamAttempt.overallEstimatedNclc`, using `CLBConversionTable` as the calibration reference.

---

## 4. Implementation notes

- **Content in JSON, not in a database**: `ExamDefinition`, `ExamSection`, `TaskTemplate`, `PromptItem`, and `MCQQuestion` can live as `.json` files under `/content/{examType}/{sectionType}/`. This makes community contributions simple JSON-diff pull requests, without needing access to a production database.
- **Prisma schema**: the user-data types (`User`, `ExamAttempt`, `SectionAttempt`, `TaskSubmission`, `ScoringResult`, `ContentContribution`) map almost 1:1 to a `schema.prisma` — worth generating once the conceptual schema is validated.
- **Content versioning**: the `version` field on `ExamDefinition` exists because official formats change over time (TEF already had a scale adjustment in 2024). Treat structural changes as a new version, not a silent patch.
- **Privacy**: if the app runs without login, `User` can be purely local (localStorage/IndexedDB on the client, never on the server) — this avoids handling third-party personal data in a volunteer-maintained open-source project.
