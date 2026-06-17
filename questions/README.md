# questions/

This folder contains the quiz questions and a helper script for downloading background images.

## prepare-questions.py

Downloads background images for each answer option from [Wikimedia Commons](https://commons.wikimedia.org/) (no API key required).

### What it does

1. Reads `questions.json` and validates that `questionNo` values are sequential (1, 2, 3, …), repairing them automatically if not.
2. For every answer option that has an `image.searchKeywords` field, searches Wikimedia Commons and downloads the best matching image.
3. Saves each image as `images/question-{N}{a|b}.jpeg`.
4. Writes the downloaded path back into `image.path` in `questions.json`.
5. Skips images that are already present on disk.

### Setup

```bash
cd questions
python3 -m venv venv
source venv/bin/activate
pip install requests
```

### Usage

```bash
cd questions
python3 prepare-questions.py
```

Run from the `questions/` directory. The script will print progress for each image (`OK`, `SKIP`, or `FAIL`) and a summary at the end.

## questions.json

Production questions used by the app. Each answer option may include:

```json
"image": {
  "searchKeywords": "keywords used to find the image on Wikimedia",
  "path": "images/question-1a.jpeg"
}
```

`path` is written by `prepare-questions.py` after a successful download and is what the app reads at runtime.

See the general [app README](../README.md) for the question format.

## questions-SAMPLE.json

A minimal one-question file used when the app is loaded in test mode (`?mode=testing`). Useful for fast iteration during development.
