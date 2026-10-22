---
name: lrv
description: show diffs for human code review in lrv
---

# lrv

Run `lrv` to open a diff in a browser UI for code review. The user submits
comments which are returned as JSON or text. Apply all comments as code fixes.

## NEVER pipe or redirect lrv's output

`lrv`'s **stdout is how the review comments reach you**. It is the entire point
of running the tool. NEVER pipe it, NEVER redirect it, NEVER capture it.

NEVER do any of these:

```
git diff | lrv > /tmp/review.json      # WRONG — comments lost
git diff | lrv | tee /tmp/review.json  # WRONG — comments lost
git diff | lrv | jq .                  # WRONG — comments lost
git diff | lrv | cat                   # WRONG — comments lost
RESULT=$(git diff | lrv)               # WRONG — comments lost
git diff | lrv &                       # WRONG — comments lost
```

Do this instead — `lrv` is the last command in the pipeline, nothing after it:

```
git diff | lrv --title="description"
```

Piping a diff *into* `lrv` is required and correct. It is `lrv`'s own output
that must never be piped, redirected, backgrounded, or captured into a variable
or file. If you redirect it, the user's review is thrown away and their work is
wasted.

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

## Loading external review comments

```bash
# Validate a review notes JSON file
lrv --validate-review-notes /tmp/notes.json

# GitHub PR comments (pipe gh output, don't let lrv call gh itself)
gh api --paginate repos/OWNER/REPO/pulls/N/comments > /tmp/pr-comments.json
git diff main..HEAD | lrv --github-pr-comments /tmp/pr-comments.json
# or with process substitution
git diff main..HEAD | lrv --github-pr-comments <(gh api --paginate repos/OWNER/REPO/pulls/N/comments)

# Phabricator — with API token (PHABRICATOR_API_KEY env var)
lrv --phab-revision D123456 ...

# Phabricator — without token, using mcp__moz__get_phabricator_revision
# 1. Call the MCP tool and write its output to a file
# 2. Pass to lrv
lrv --phab-mcp-comments /tmp/phab.md ...
```

## Behavior

- Run `lrv` synchronously. Never use a sub-agent or background task.
- Never pipe, redirect, background, or capture `lrv`'s output. Read the comments
  from its stdout in the tool result.
- Always print the URL(s) so the user can open them.
- Wait for the user to submit comments.
- Plan one fix per comment before touching any code. Never skip a comment.
- Apply all fixes directly. No explanations or commentary.
- A comment with `in_reply_to` responds to a review note (`author`, `body`,
  `source_url`). An empty `body` means address that note; otherwise `body` is
  the user's reply, which tells you how they want it handled.
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
- If comments are somehow lost anyway, they are also stored in a local SQLite
  database: `lrv --list-reviews` lists stored review sessions and
  `lrv --recover [<id>]` prints one session's comments as JSON.
- Series mode: output is a `commits` array, each entry has `commit_hash`,
  `commit_message`, and a `comments` list. Work through the array in order:
  for each commit that has comments, edit that commit and apply all its fixes,
  then return to the top of the stack before moving on.

## Adding notes to a running review

When the user already has lrv open, write notes JSON using the same schema
as `--review-notes-file`, then run this from the repository:

```bash
lrv --add-notes /tmp/notes.json
```

Notes appear in the open page without a reload. Re-running the same batch
is a no-op; the command reports added and skipped counts. Use `-` instead
of a file to read JSON from stdin. Never start a second lrv just to show
notes in an existing review.

## Listening for discussions

Use this when the user already has lrv open and asks you to listen or discuss.
If you started lrv yourself, you are blocked on it and can't listen. Never
start a second lrv, and never background the one you started to listen.

Run `lrv --listen` from the repository in the foreground. Set the tool timeout
above `--listen-timeout` (default 90 seconds), allowing for request overhead.
Never pipe, redirect, or capture its output; read it in the tool result.
Use one listener per review: the read position is shared.

The output defaults to JSON (`--format json`), with a `status` field:

- `events`: the `events` array contains objects with `seq` and `type`.
  Handle every event in the batch, then listen again.
  - `type: "discussion"` has `discussion` containing `id`, `created_at`,
    `file`, `line`, `side`, `body`, and optional `thread_id`, `summarize` and
    `commit_idx`. Reply with `lrv --add-notes <file>`, setting `discussion_id` to
    `thread_id` if present, otherwise `id`. It must name the root discussion;
    using a follow-up's own id is rejected. Copy `file`, `line`, and `side`
    (required even though the server moves the reply to the thread), and set
    `author` to your name.
  - `type: "discussion_deleted"` has the `id` of a root discussion the user
    deleted. Stop any work on that thread and don't reply; a late reply is
    skipped.
- `timeout`: run `lrv --listen` again straight away.
- `ended`: stop and tell the user the review is over. Submitted comments went
  to whoever started lrv, not the listener. To apply them, ask the user to
  paste them or name a session from `lrv --list-reviews`.

All three statuses exit 0. On a non-zero exit, stop and tell the user about
the error; the review may be missing or have restarted. The header's
"Connected" indicator stays on while a poll is open and for a lease
after the last poll or authenticated note write (`LRV_AGENT_LEASE_SECS`,
default 300 seconds).

A follow-up with `summarize: true` asks for a summary of that thread as a
standalone review comment. Reply the normal way with `discussion_id` naming
the root and add `"summary": true`. Write only the comment body, with no preamble.
The reviewer can edit it in Convert before saving it as an ordinary comment.

The user is waiting in the page. Answer each discussion briefly and return
to listening quickly. A discussion is a question or a request to talk;
change code only if the user explicitly asks in the discussion.

For example, to reply to a root discussion (or a follow-up whose `thread_id`
is `lrv-discussion-1`), write this JSON to `/tmp/lrv-reply.json` with your
file-writing tool:

```json
[{"file":"src/file.rs","line":42,"side":"new","body":"hi","discussion_id":"lrv-discussion-1","author":"Agent"}]
```

Then run:

```bash
lrv --add-notes /tmp/lrv-reply.json
```

Some harnesses statically reject shell commands that contain JSON (a brace
next to a quote). Never inline JSON in a shell command (heredoc, `echo`, or
otherwise), and don't retry inline after a rejection; write a file instead.

`discussion_id` is accepted only by a running review, not by
`--review-notes-file` or `--validate-review-notes`.
