#!/usr/bin/env python3
"""Generates listening-comprehension audio for content/{examType}/comprehension_orale.

Reads each MCQQuestion's dialogueScript (see src/lib/content-types.ts) and
synthesizes it with pocket-tts (https://github.com/kyutai-labs/pocket-tts),
one voice per speaker, concatenated with a short silence between turns.
Output is never committed to git — see .gitignore.

Usage:
    python3 scripts/generate_audio.py [--exam tef|tcf|all] [--force]

Requires: pip install pocket-tts scipy
"""

import argparse
import json
from pathlib import Path

import numpy as np
import scipy.io.wavfile
from pocket_tts import TTSModel

REPO_ROOT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = REPO_ROOT / "content"
PUBLIC_ROOT = REPO_ROOT / "public"

# pocket-tts only ships a 24-layer model for French; the standard-size
# checkpoint isn't available for this language (confirmed by the library
# itself: it raises if you ask for "french" instead of "french_24l").
LANGUAGE = "french_24l"

SILENCE_SECONDS = 0.3


def load_questions(exam: str) -> list[dict]:
    path = CONTENT_ROOT / exam / "comprehension_orale" / "questions.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def generate_dialogue_audio(model: TTSModel, voice_states: dict, turns: list[dict]) -> np.ndarray:
    silence = np.zeros(int(model.sample_rate * SILENCE_SECONDS), dtype=np.float32)
    chunks = []
    for i, turn in enumerate(turns):
        voice = turn["voice"]
        if voice not in voice_states:
            voice_states[voice] = model.get_state_for_audio_prompt(voice)
        audio = model.generate_audio(voice_states[voice], turn["text"])
        chunks.append(audio.numpy())
        if i < len(turns) - 1:
            chunks.append(silence)
    return np.concatenate(chunks)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exam", choices=["tef", "tcf", "all"], default="all")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the audio file already exists")
    args = parser.parse_args()

    exams = ["tef", "tcf"] if args.exam == "all" else [args.exam]

    pending = []
    for exam in exams:
        for question in load_questions(exam):
            if question.get("stimulusType") != "audio" or not question.get("dialogueScript"):
                continue
            out_path = PUBLIC_ROOT / question["stimulusContent"].lstrip("/")
            if out_path.exists() and not args.force:
                print(f"skip (exists): {question['id']}")
                continue
            pending.append((question, out_path))

    if not pending:
        print("Nothing to generate.")
        return

    print(f"Loading pocket-tts model (language={LANGUAGE})...")
    model = TTSModel.load_model(language=LANGUAGE)
    voice_states: dict = {}

    for question, out_path in pending:
        print(f"generating {question['id']} -> {out_path.relative_to(REPO_ROOT)}")
        audio = generate_dialogue_audio(model, voice_states, question["dialogueScript"])
        out_path.parent.mkdir(parents=True, exist_ok=True)
        scipy.io.wavfile.write(out_path, model.sample_rate, audio)

    print(f"Done. Generated {len(pending)} file(s).")


if __name__ == "__main__":
    main()
