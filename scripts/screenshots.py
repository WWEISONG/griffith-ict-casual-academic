"""
Capture the three role views from the live site, for the briefing deck.

    python3 scripts/screenshots.py

Credentials come from .env.local, which is untracked.
"""
import os, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

def load_env(p=".env.local"):
    if not Path(p).exists(): return
    for line in Path(p).read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env()
SITE = "https://wweisong.github.io/griffith-ict-casual-academic/"
OUT  = Path("docs/tutor-program/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

ACCOUNTS = [
    ("candidate", "sample.liam.chen@griffithuni.edu.au", "SamplePortal#2027", "#/app"),
    ("convenor",  "sample.convenor@griffith.edu.au",     "SamplePortal#2027", "#/app"),
    ("admin",     os.environ.get("SUPER_ADMIN_EMAIL", ""), os.environ.get("SUPER_ADMIN_PASSWORD", ""), "#/app"),
]

def shot(page, name):
    page.wait_for_timeout(1400)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path))
    print(f"  {path}  ({path.stat().st_size // 1024} KB)")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)

    # Public entrances.
    page = ctx.new_page()
    page.goto(SITE, wait_until="networkidle"); shot(page, "00-entrance-candidate")
    page.goto(SITE + "#/staff", wait_until="networkidle"); shot(page, "01-entrance-staff")
    page.close()

    for role, email, pw_, path in ACCOUNTS:
        if not email or not pw_:
            print(f"  ! {role}: no credentials, skipped"); continue
        page = ctx.new_page()
        page.goto(SITE + "#/login", wait_until="networkidle")
        page.fill("#email", email)
        page.fill("#password", pw_)
        page.click("button[type=submit]")
        try:
            page.wait_for_url(re.compile(r"#/app"), timeout=20000)
        except Exception:
            print(f"  ! {role}: did not reach the app")
            page.screenshot(path=str(OUT / f"ERROR-{role}.png")); page.close(); continue
        page.wait_for_timeout(2200)
        shot(page, f"1{ACCOUNTS.index((role,email,pw_,path))}-{role}")

        # A second, deeper view for each staff role.
        if role in ("convenor", "admin"):
            try:
                page.click("tbody tr", timeout=6000)
                page.wait_for_timeout(2000)
                shot(page, f"2{ACCOUNTS.index((role,email,pw_,path))}-{role}-detail")
            except Exception:
                print(f"    ({role}: no candidate row to open)")
        if role == "admin":
            page.goto(SITE + "#/app/people", wait_until="networkidle")
            page.wait_for_timeout(1800)
            shot(page, "30-admin-accounts")

        # Sign out so the next context starts clean.
        try:
            page.click("text=Sign out", timeout=4000); page.wait_for_timeout(1200)
        except Exception:
            pass
        page.close()

    browser.close()
print("done")
