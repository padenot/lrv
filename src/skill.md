---
name: lrv
description: show diffs for human code review in lrv
---

# lrv

Run `lrv` to open a diff in a browser UI for code review. The user submits
comments which are returned as JSON or text. Apply all comments as code fixes.

## Usage

```
# Uncommitted changes
jj diff --git | lrv --title="description"
git diff | lrv --title="description"

# Single committed revision
lrv --cmd "jj show --git -r <rev>"
lrv --cmd "git show HEAD"

# Full branch as a series of commits
lrv --series "trunk()..@"    # jj revset
lrv --series "main..HEAD"    # git range

# Local LLM pre-review requested by the user
# 1. Review the diff yourself before launching lrv.
# 2. Write findings as review notes JSON.
# 3. Launch lrv with those notes.
git diff > /tmp/lrv.diff
lrv --file /tmp/lrv.diff --review-notes-file /tmp/lrv-local-review.json
```

## Behavior

- Run `lrv` synchronously. Never use a sub-agent or background task.
- Always print the URL(s) so the user can open them.
- Wait for the user to submit comments.
- Plan one fix per comment before touching any code. Never skip a comment.
- Apply all fixes directly. No explanations or commentary.
- If the user asks for a local LLM pre-review, perform the review before
  starting `lrv`, write a JSON array of review notes, and pass it with
  `--review-notes-file`. Do not make `lrv` call a model.
- Local pre-review note schema: `file`, `line`, `side`, and `body` are
  required. Optional fields: `id`, `author`, `date`, `source_url`,
  `commit_idx`. Use exact diff file paths; use `side: "new"` for comments on
  changed/new code; use `file: "(commit)"`, `line: 1`, `side: "new"` for
  global comments. In series mode, set `commit_idx` to the zero-based commit
  index.
- Single-commit mode: put the change in the correct commit (amend, absorb, squash).
- Series mode: output is a `commits` array, each entry has `commit_hash`,
  `commit_message`, and a `comments` list. Work through the array in order:
  for each commit that has comments, edit that commit and apply all its fixes,
  then return to the top of the stack before moving on.
