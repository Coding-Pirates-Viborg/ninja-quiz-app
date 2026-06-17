#!/usr/bin/env python3
"""
Download background images for ninja-quiz-app via Wikimedia Commons (no API key needed).
Run with: python3 download-images.py
Requires: pip3 install requests
"""

import json
import os
import time
import requests

SCRIPT_DIR     = os.path.dirname(os.path.abspath(__file__))
IMAGES_SUBDIR  = "images"
IMAGES_DIR     = os.path.join(SCRIPT_DIR, IMAGES_SUBDIR)
QUESTIONS_FILE = os.path.join(SCRIPT_DIR, "questions.json")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Wikimedia kræver en beskrivende User-Agent med kontaktinfo
HEADERS = {
    "User-Agent": "ninja-quiz-app/1.0 (https://github.com/kodepirat; esgemoos@gmail.com) python-requests/2.x"
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# Sekunder mellem hvert API-kald — hold Wikimedia glad
API_DELAY = 2.0

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


def load_questions(path: str) -> list:
    """Load questions.json and repair questionNo if out of sequence."""
    with open(path, encoding="utf-8") as f:
        questions = json.load(f)

    dirty = False
    for i, q in enumerate(questions):
        expected = i + 1
        if q.get("questionNo") != expected:
            print(f"  FIX   questionNo {q.get('questionNo')} → {expected}")
            q["questionNo"] = expected
            dirty = True

    if dirty:
        save_questions(path, questions)
        print()

    return questions


def save_questions(path: str, questions: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
        f.write("\n")


def api_get(params: dict, retries: int = 4) -> dict:
    """GET fra Wikimedia API med automatisk retry ved 429."""
    for attempt in range(retries):
        try:
            r = SESSION.get(
                "https://commons.wikimedia.org/w/api.php",
                params=params,
                timeout=20,
            )
            if r.status_code == 429:
                wait = 10 * (attempt + 1)
                print(f"    429 rate limit — venter {wait}s ...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                time.sleep(5)
            else:
                print(f"    API-fejl: {e}")
    return {}


def search_wikimedia(keywords: str) -> str | None:
    """Returnér direkte billed-URL fra Wikimedia Commons."""
    # Trin 1: søg efter filnavne
    search_data = api_get({
        "action": "query",
        "list": "search",
        "srsearch": keywords,
        "srnamespace": 6,
        "srlimit": 5,
        "format": "json",
    })
    time.sleep(API_DELAY)

    hits = search_data.get("query", {}).get("search", [])
    if not hits:
        return None

    # Trin 2: hent URL for første brugbare fil
    titles = "|".join(h["title"] for h in hits)
    info_data = api_get({
        "action": "query",
        "titles": titles,
        "prop": "imageinfo",
        "iiprop": "url|mime|size",
        "format": "json",
    })
    time.sleep(API_DELAY)

    pages = info_data.get("query", {}).get("pages", {})
    candidates = []
    for page in pages.values():
        for info in page.get("imageinfo", []):
            mime = info.get("mime", "")
            url = info.get("url", "")
            size = info.get("size", 0)
            if mime in ALLOWED_MIME and size > 50_000:
                candidates.append((size, url))

    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1]
    return None


def download_image(filename: str, keywords: str) -> str | None:
    """Download image and return relative path on success, None on failure."""
    filepath = os.path.join(IMAGES_DIR, f"{filename}.jpeg")
    if os.path.exists(filepath):
        print(f"  SKIP  {filename}.jpeg")
        return f"{IMAGES_SUBDIR}/{filename}.jpeg"

    url = search_wikimedia(keywords)
    if not url:
        print(f"  FAIL  {filename}.jpeg — ingen resultater for '{keywords}'")
        return None

    try:
        r = SESSION.get(url, timeout=30)
        if r.status_code == 200 and len(r.content) > 5_000:
            with open(filepath, "wb") as f:
                f.write(r.content)
            print(f"  OK    {filename}.jpeg ({len(r.content)//1024} KB)")
            return f"{IMAGES_SUBDIR}/{filename}.jpeg"
        else:
            print(f"  FAIL  {filename}.jpeg — status {r.status_code}")
            return None
    except Exception as e:
        print(f"  ERROR {filename}.jpeg — {e}")
        return None


if __name__ == "__main__":
    questions = load_questions(QUESTIONS_FILE)

    total = sum(
        1
        for q in questions
        for side in ("a", "b")
        if q.get(side, {}).get("image", {}).get("searchKeywords")
    )
    print(f"Downloader {total} billeder til:\n  {IMAGES_DIR}\n")

    ok, failed = 0, []

    for q in questions:
        for side in ("a", "b"):
            img = q.get(side, {}).get("image")
            if not img or not img.get("searchKeywords"):
                continue
            filename = f"question-{q['questionNo']}{side}"
            path = download_image(filename, img["searchKeywords"])
            if path:
                img["path"] = path
                ok += 1
            else:
                failed.append((filename, img["searchKeywords"]))

    save_questions(QUESTIONS_FILE, questions)

    print(f"\n{'='*50}")
    print(f"Færdig: {ok}/{total} hentet")
    if failed:
        print("\nFejlede (prøv evt. andre keywords):")
        for fn, kw in failed:
            print(f"  {fn}: '{kw}'")
    else:
        print("Alle billeder hentet!")
