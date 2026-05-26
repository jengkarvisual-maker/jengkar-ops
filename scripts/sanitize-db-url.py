#!/usr/bin/env python3
from __future__ import annotations

import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


DROP_QUERY_KEYS = {
    "schema",
    "pgbouncer",
    "connection_limit",
    "pool_timeout",
}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: sanitize-db-url.py <database-url>", file=sys.stderr)
        return 1

    raw = sys.argv[1].strip()

    if not raw:
        print("Database URL cannot be empty.", file=sys.stderr)
        return 1

    parsed = urlsplit(raw)
    query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key not in DROP_QUERY_KEYS
    ]

    print(urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
