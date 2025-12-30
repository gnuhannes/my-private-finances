# Security Policy

This document describes how to report security issues related to "My Private Finances".

***

## Scope

"My Private Finances" is an early-stage project.

The following components are considered in scope:
- Backend API (api/)
- Frontend application (app/)
- Local data handling and storage
- Build and CI configuration

Third-party dependencies are considered in scope only insofar as they are used
by this project.

***

## Supported Versions

Currently, only the main branch is actively supported.

Security fixes will be applied to main.
No backports are provided at this stage.

***

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

Preferred contact:

Email: johannes@wissmann.dev

Please include:
- A description of the issue
- Steps to reproduce (if possible)
- Potential impact
- Any relevant logs or screenshots

Do not open a public GitHub issue for security-sensitive reports.

***

## Security Design Notes
- "My Private Finances" is designed to minimize attack surface by operating locally
- No user data is transmitted to external services by default
- All dependencies are managed explicitly and audited via CI
- Contributors are encouraged to keep security and privacy considerations in mind