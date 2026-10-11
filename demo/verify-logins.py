"""Verify that every demo account in demo/demo-accounts.local.json can sign in with the Supabase password grant.

Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local. Prints one line per account (never the password).
Usage:  python demo/verify-logins.py
"""
import json, os, sys, urllib.request, urllib.error

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
with open(os.path.join(root, ".env.local"), encoding="utf8") as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            k, v = line.rstrip("\n").split("=", 1)
            env[k.strip()] = v.strip().strip('"')
url, key = env["NEXT_PUBLIC_SUPABASE_URL"], env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
accounts = json.load(open(os.path.join(root, "demo", "demo-accounts.local.json")))
ok = 0
for a in accounts:
    body = json.dumps({"email": a["email"], "password": a["password"]}).encode()
    req = urllib.request.Request(f"{url}/auth/v1/token?grant_type=password", data=body, headers={"apikey": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)
            # read the profile role through PostgREST with the user's own token (RLS applies)
            preq = urllib.request.Request(f"{url}/rest/v1/profiles?select=role&id=eq.{d['user']['id']}", headers={"apikey": key, "Authorization": f"Bearer {d['access_token']}"})
            with urllib.request.urlopen(preq, timeout=30) as pr:
                role = (json.load(pr) or [{}])[0].get("role")
            status = "OK " if role == a["role"] else "ROLE MISMATCH"
            if role == a["role"]: ok += 1
            print(f"{status} {a['email']:40s} expected={a['role']:12s} actual={role}")
    except urllib.error.HTTPError as e:
        print(f"FAIL {a['email']:40s} HTTP {e.code} {e.read()[:120]!r}")
    except Exception as e:  # noqa: BLE001
        print(f"FAIL {a['email']:40s} {e}")
print(f"\n{ok}/{len(accounts)} accounts verified")
sys.exit(0 if ok == len(accounts) else 1)
