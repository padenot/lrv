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

For a local LLM pre-review requested by the user, review the diff yourself
before launching `lrv`, write the findings as review notes JSON, and pass them
to `lrv`:

```
git diff > /tmp/lrv.diff
# write /tmp/lrv-local-review.json from that diff
lrv --file /tmp/lrv.diff --review-notes-file /tmp/lrv-local-review.json
```

## Behavior

- Silently run `lrv`. Never run it in a sub-agent or background task, this NEEDS
  to be synchronous.
- Always print the URLs (plural) for the user to see. Otherwise the whole ordeal
  is useless.
- Wait for user to submit comments
- If asked for a local LLM pre-review, do the review yourself before starting
  `lrv`. Do not make `lrv` call a model.
- Local pre-review note schema: JSON array of objects with required `file`,
  `line`, `side`, and `body`; optional `id`, `author`, `date`, `source_url`,
  `commit_idx`. Use exact diff file paths; use `side: "new"` for comments on
  changed/new code; use `file: "(commit)"`, `line: 1`, `side: "new"` for
  global comments. In series mode, set `commit_idx` to the zero-based commit
  index. Set `author` to something like `Local LLM review`.
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
- When addressing review comments on a series, it is best to work bottom to top.
  In `jj`, this is straightforward: either `jj edit` the target commit
  directly, or `jj new` on top of it, make the change, and squash it back.
  In Git, agents should usually avoid interactive editors: create a `fixup!`
  commit for the target commit, then run
  `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash <base>` to fold it in
  non-interactively. As a fallback, with a clean worktree, an agent can check
  out the target commit, edit or amend it, then replay descendants with
  `git cherry-pick`. Conflicts are expected and need to be resolved.
