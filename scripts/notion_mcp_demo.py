"""
Utility script to exercise the Notion 2025-09-03 API with data_source_ids.

Prereqs:
  export NOTION_TOKEN=...
  export NOTION_DATABASE_IDS=id1,id2,...
"""

import os
import sys
from typing import Iterable, List

import requests


def load_env_from_files(paths: Iterable[str]):
    """Lightweight loader for KEY=VALUE lines in .env files (no quotes, no export)."""
    for path in paths:
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val


# Populate env from local files if variables are not already set.
load_env_from_files([".env.local", ".env"])

NOTION_TOKEN = os.getenv("NOTION_TOKEN")
RAW_IDS = os.getenv("NOTION_DATABASE_IDS", "")

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}" if NOTION_TOKEN else "",
    "Notion-Version": "2025-09-03",
    "Content-Type": "application/json",
}

session = requests.Session()
session.headers.update(HEADERS)


def parse_ids(raw: str) -> List[str]:
    return [part.strip() for part in raw.split(",") if part.strip()]


def get_data_sources(database_id: str):
    url = f"https://api.notion.com/v1/databases/{database_id}"
    res = session.get(url, timeout=15)
    res.raise_for_status()
    payload = res.json()
    sources = payload.get("data_sources") or []
    if not sources:
        raise RuntimeError(f"No data_sources returned for {database_id}")
    return sources


def query_data_source(data_source_id: str):
    url = f"https://api.notion.com/v1/data_sources/{data_source_id}/query"
    res = session.patch(url, json={}, timeout=20)
    res.raise_for_status()
    return res.json()


def main(ids: Iterable[str]):
    if not NOTION_TOKEN:
        sys.exit("Set NOTION_TOKEN in your environment.")
    if not ids:
        sys.exit("Set NOTION_DATABASE_IDS with comma-separated database IDs.")

    print(f"Found {len(list(ids))} database ids")
    for db_id in ids:
        print(f"\nDatabase: {db_id}")
        sources = get_data_sources(db_id)
        for src in sources:
            ds_id = src["id"]
            name = src.get("name", "")
            print(f"  Data source: {name} ({ds_id})")
            result = query_data_source(ds_id)
            page_count = len(result.get("results", []))
            print(f"    Query results: {page_count} items")


if __name__ == "__main__":
    database_ids = parse_ids(RAW_IDS)
    main(database_ids)
