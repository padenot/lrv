---
name: lrv
description: show the current changes, or other changes, in lrv code review tool
---

# lrv

Invoke lrv tool for code review, potentially showing the diff requested
by the author (e.g. "open lrv on the diff of the entire branch" will pipe the
diff from the current commit up to the main branch). On submission, fix issues
without summary.

## Behavior

- Silently run `lrv`
- Wait for user to submit comments
- Apply fixes directly to code
- No explanations or commentary
