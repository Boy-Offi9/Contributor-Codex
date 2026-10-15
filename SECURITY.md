# Security

## Reporting a vulnerability

Please report security issues privately through GitHub's "Report a vulnerability" button on this repository's **Security** tab. Don't open a public issue for something exploitable. I'll acknowledge within a few days.

## What this service handles

- **A server-side GitHub token** (`GITHUB_TOKEN`). It is only ever sent to `api.github.com`, never returned in a response, and never logged. Use a fine-grained token with no permissions beyond public data, and rotate it if you suspect exposure.
- **User-controlled input** that ends up in an API URL or an SVG: usernames, orgs, repos, colours, shapes and themes. Names are validated against GitHub's own format before use (`isGhName` / `isGhRepo`), colours must be hex, enum parameters fall back to defaults, and everything drawn into a card is XML-escaped.
- **Response hardening:** cards are served with a strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff` and `role="img"`.

## In scope

Injection through any query parameter, anything that makes the server call a GitHub URL other than the intended one, token disclosure, and SVG output that can run script.

## Out of scope

Rate-limit exhaustion of a public deployment (self-host with your own token for heavy use), and issues in GitHub's image proxy or API.
