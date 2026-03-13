---
name: lrv
description: show the current changes, or other changes, in lrv code review tool
---

# lrv

Invoke lrv tool for code review, potentially showing the diff requested
by the author (e.g. "open lrv on the diff of the entire branch" will pipe the
diff from the current commit up to the main branch). On submission, fix issues
without summary.

Do it like this (adapt those examples):

```
jj diff --git | lrv --title="One sentence description if possible" # if not commited
jj show --git -r changeid | lrv # if commited
git diff | lrv # if not commited
git diff HEAD^ | lrv # if commited
```

only ever show a single revision, because it can otherwise be confusing. The
tool doesn't support multiple revisions, revsets, ranges, etc.

## Behavior

- Silently run `lrv`. Never run it in a sub-agent or background task, this NEEDS
  to be synchronous.
- Always print the URLs (plural) for the user to see. Otherwise the whole ordeal
  is useless.
- Wait for user to submit comments
- When comments are received, make a plan about them. One plan per item. This is
  absolutely critical to avoid skipping comments.
- Apply fixes directly to code
- No explanations or commentary
- If we're looking at something already committed, put the change into the right
  commit, e.g. squash, absorb, git commit --amend, etc.
