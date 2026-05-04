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

For reviewing a full branch as a series of individual commits:

```
lrv --series "trunk()..@"      # jj revset
lrv --series "main..HEAD"      # git range
```

The UI shows a commit strip; comments are grouped per commit in the output.

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
- Single-commit mode: put the change into the right commit (squash, absorb,
  git commit --amend, jj squash, etc.)
- Series mode: output is a `commits` array, each entry has `commit_hash`,
  `commit_message`, and a `comments` list. Work through commits in order:
  for each commit that has comments, edit it and apply all its fixes,
  then `jj edit` back to the top of the stack before moving on.
