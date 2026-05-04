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
```

## Behavior

- Run `lrv` synchronously. Never use a sub-agent or background task.
- Always print the URL(s) so the user can open them.
- Wait for the user to submit comments.
- Plan one fix per comment before touching any code. Never skip a comment.
- Apply all fixes directly. No explanations or commentary.
- Single-commit mode: put the change in the correct commit (amend, absorb, squash).
- Series mode: output is a `commits` array, each entry has `commit_hash`,
  `commit_message`, and a `comments` list. Work through the array in order:
  for each commit that has comments, edit that commit and apply all its fixes,
  then return to the top of the stack before moving on.
