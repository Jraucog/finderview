# Security Policy

The **FinderView** team takes application security and local system integrity seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within FinderView, please do **NOT** disclose it publicly via a GitHub issue.

Instead, please report the vulnerability privately:
1. Use GitHub's [Private Vulnerability Reporting](https://github.com/Jraucog/finderview/security/advisories/new) feature on this repository.
2. Or contact the maintainers directly with details, steps to reproduce, and potential impact.

### Security Architecture Principles
FinderView enforces:
- `contextIsolation: true` and `nodeIntegration: false` across all browser windows.
- Strict Content Security Policy (`CSP`).
- Safe parameterization of child process invocations (`spawn` with fixed argument vectors) to prevent command injection.
- Automated security regression test suite on every commit (`npm test`).
