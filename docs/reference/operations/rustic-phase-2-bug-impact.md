# Rustic Phase 2 Bug Impact Workflow

Rustic Phase 2 pauses general open-source contributions while keeping the repository public. The open community lane is bug reporting through GitHub Issues. Impact points are awarded for accepted bug reports only after the bug is officially resolved.

## Intake Rules

1. Use the Phase 2 bug report form for all public bug reports.
2. Feature requests, general contribution proposals, and broad refactors are out of scope during Phase 2.
3. Security vulnerabilities, privacy issues, secret leaks, and exploit reports must not be filed publicly. Use the private vulnerability reporting path in `SECURITY.md`.
4. Anyone can file multiple bug reports, but volume alone does not earn impact points.

## Triage Labels

Use these labels as the public state machine:

| Label | Meaning |
| --- | --- |
| `phase2:needs-triage` | New report waiting for maintainer review. |
| `phase2:needs-info` | Reporter must add reproduction detail or evidence before acceptance. |
| `phase2:accepted` | Maintainer confirmed the report is valid and eligible for tracking. |
| `phase2:invited-pr` | Maintainer invited a contributor PR for this accepted issue. |
| `phase2:resolved` | The bug is fixed by a merged PR, commit, release, or maintainer-verified resolution. |
| `phase2:points-awarded` | Impact points were recorded in the GitHub Project ledger. |
| `phase2:duplicate` | The report duplicates an existing issue and earns no points. |
| `phase2:invalid` | The report is not a valid bug and earns no points. |
| `phase2:spam` | The report is spam or abusive and earns no points. |
| `phase2:no-points` | The issue is closed without impact points for a documented reason. |

Use `severity:p0`, `severity:p1`, `severity:p2`, and `severity:p3` to classify accepted bugs.

## Impact Ledger

Track accepted bugs in the GitHub Project named `Rustic Phase 2 Bug Impact Ledger`.

Project fields:

| Field | Type | Values or rule |
| --- | --- | --- |
| `Status` | single select | `New`, `Needs triage`, `Needs info`, `Accepted`, `In fix`, `Resolved pending award`, `Points awarded`, `Closed no points` |
| `Severity` | single select | `P0`, `P1`, `P2`, `P3` |
| `Report Quality` | number | 0-5 bonus for reproducibility, evidence, scope clarity, and useful diagnosis |
| `Impact Points` | number | Base severity points plus quality bonus |
| `Award Reason` | text | Short maintainer explanation |
| `Resolved By PR` | text | Merged PR, commit, release, or resolution evidence |
| `Reporter` | text | Original GitHub reporter |
| `Awarded On` | date | Date points were recorded |

Setup command after the GitHub CLI has `project` and `read:project` scopes:

```bash
bash scripts/setup-rustic-phase2-project.sh
```

Status flow:

`New` -> `Needs triage` -> `Needs info` or `Accepted` -> `In fix` -> `Resolved pending award` -> `Points awarded` or `Closed no points`.

## Scoring

Base points:

| Severity | Base points |
| --- | ---: |
| `P0` | 25 |
| `P1` | 15 |
| `P2` | 8 |
| `P3` | 3 |

Add a 0-5 quality bonus after triage. Award 0 points for duplicates, spam, invalid reports, feature requests, and public security disclosures.

Award points only after a maintainer verifies that the bug is resolved. The issue must either be linked from a merged PR with a closing keyword such as `Fixes #123`, `Closes #123`, or `Resolves #123`, or contain a maintainer comment with commit, release, or deployment evidence.

## PR Policy

External bug-fix PRs are invite-only during Phase 2. A contributor PR is eligible for review only when:

1. the PR uses a closing keyword that links to the bug issue
2. the linked issue has `phase2:accepted`
3. the linked issue has `phase2:invited-pr`
4. normal DCO, CI, CODEOWNERS, and maintainer review gates still pass

Maintainer/internal PRs can proceed without invitation labels, but they should still link the accepted bug issue when one exists.
