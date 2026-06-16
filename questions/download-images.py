#!/usr/bin/env python3
"""
Download background images for ninja-quiz-app via Wikimedia Commons (no API key needed).
Run with: python3 download-images.py
Requires: pip3 install requests
"""

import os
import time
import requests

IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Wikimedia kræver en beskrivende User-Agent med kontaktinfo
HEADERS = {
    "User-Agent": "ninja-quiz-app/1.0 (https://github.com/kodepirat; esgemoos@gmail.com) python-requests/2.x"
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# Sekunder mellem hvert API-kald — hold Wikimedia glad
API_DELAY = 2.0

# (filename_without_ext, wikimedia_search_keywords)
IMAGES = [
    # Q1: Satellitter i kredsløb
    ("question-1a", "satellite orbit earth space"),
    ("question-1b", "satellite constellation space debris orbit"),
    # Q2: Starlink
    ("question-2a", "Starlink satellite train night sky"),
    ("question-2b", "SpaceX Falcon 9 rocket launch"),
    # Q3: Kondensator
    ("question-3a", "capacitor electronic component circuit"),
    ("question-3b", "water condensation droplets glass"),
    # Q4: Spole
    ("question-4a", "remote control television"),
    ("question-4b", "inductor solenoid coil electrical"),
    # Q5: HTML
    ("question-5a", "web browser source code HTML"),
    ("question-5b", "graphic design digital art creative"),
    # Q6: Browser
    ("question-6a", "web browser laptop internet"),
    ("question-6b", "search engine results internet"),
    # Q7: NPC
    ("question-7a", "playing cards poker deck"),
    ("question-7b", "video game screenshot role-playing"),
    # Q8: FPS
    ("question-8a", "gaming monitor esport computer"),
    ("question-8b", "children playing outdoor playground"),
    # Q9: Toad
    ("question-9a", "turtle tortoise reptile animal"),
    ("question-9b", "mushroom toadstool forest fungi"),
    # Q10: Captain America
    ("question-10a", "comic book superhero cosplay"),
    ("question-10b", "clothes iron ironing board"),
    # Q11: Nintendo
    ("question-11a", "hanafuda playing cards"),
    ("question-11b", "toy train railway locomotive"),
    # Q12: Disney
    ("question-12a", "magician stage performance"),
    ("question-12b", "animation cel cartoon drawing"),
    # Q13: sudo
    ("question-13a", "computer terminal error screen"),
    ("question-13b", "Linux bash terminal"),
    # Q14: ls
    ("question-14a", "command line terminal prompt computer"),
    ("question-14b", "neon light saber"),
    # Q15: cd
    ("question-15a", "robot humanoid"),
    ("question-15b", "folder office icon"),
    # Q16: rm
    ("question-16a", "garbage can trash"),
    ("question-16b", "army soldier military uniform"),
    # Q17: Quadcopter
    ("question-17a", "quadcopter drone four propellers aerial"),
    ("question-17b", "drone multirotor"),
    # Q18: Drone loop
    ("question-18a", "drone race FPV"),
    ("question-18b", "drone aerial landscape"),
    # Q19: Stack Overflow
    ("question-19a", "programmer keyboard hacker"),
    ("question-19b", "source code screen"),
]

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


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


def download_image(filename: str, keywords: str) -> bool:
    filepath = os.path.join(IMAGES_DIR, f"{filename}.jpeg")
    if os.path.exists(filepath):
        print(f"  SKIP  {filename}.jpeg")
        return True

    url = search_wikimedia(keywords)
    if not url:
        print(f"  FAIL  {filename}.jpeg — ingen resultater for '{keywords}'")
        return False

    try:
        r = SESSION.get(url, timeout=30)
        if r.status_code == 200 and len(r.content) > 5_000:
            with open(filepath, "wb") as f:
                f.write(r.content)
            print(f"  OK    {filename}.jpeg ({len(r.content)//1024} KB)")
            return True
        else:
            print(f"  FAIL  {filename}.jpeg — status {r.status_code}")
            return False
    except Exception as e:
        print(f"  ERROR {filename}.jpeg — {e}")
        return False


if __name__ == "__main__":
    print(f"Downloader {len(IMAGES)} billeder til:\n  {IMAGES_DIR}\n")
    ok, failed = 0, []

    for filename, keywords in IMAGES:
        success = download_image(filename, keywords)
        if success:
            ok += 1
        else:
            failed.append((filename, keywords))

    print(f"\n{'='*50}")
    print(f"Færdig: {ok}/{len(IMAGES)} hentet")
    if failed:
        print("\nFejlede (prøv evt. andre keywords):")
        for fn, kw in failed:
            print(f"  {fn}: '{kw}'")
    else:
        print("Alle billeder hentet!")
