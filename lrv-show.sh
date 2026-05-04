#!/usr/bin/env bash
# Shows what lrv would display in the browser, on the CLI.
set -euo pipefail

PARSE_DIFF="${PARSE_DIFF:-$(dirname "$0")/../../.cargo/bin/parse_diff}"
if [[ ! -x "$PARSE_DIFF" ]]; then
    PARSE_DIFF="parse_diff"
fi

json=$("$PARSE_DIFF")

echo "$json" | jq -r '
  def status_label:
    if . == "modified" then "M"
    elif . == "added" then "A"
    elif . == "deleted" then "D"
    elif . == "renamed" then "R"
    else . end;

  def pad(n): tostring | (n - length) * " " + .;

  # Header
  (if .commit_hash then "commit " + .commit_hash else empty end),
  (if .commit_author then "Author: " + .commit_author else empty end),
  (if .commit_date then "Date:   " + .commit_date else empty end),
  (if .commit_message then "\n" + (.commit_message | split("\n") | map("    " + .) | join("\n")) + "\n" else empty end),
  ((.stats.files_changed | tostring) + " file(s) changed, +" + (.stats.additions | tostring) + " -" + (.stats.deletions | tostring)),
  "",

  # Files
  (.files[] |
    . as $f |
    (if $f.old_path then $f.old_path + " -> " + $f.path else $f.path end) as $label |
    ($label + " [" + ($f.status | status_label) + "]") as $header |
    ("─" * ($header | length)) as $bar |
    "┌─" + $bar + "─┐",
    "│ " + $header + " │",
    "└─" + $bar + "─┘",

    (.hunks[] |
      "  " + .header,
      (.lines[] |
        . as $l |
        (if $l.type == "add" then "+"
         elif $l.type == "delete" then "-"
         else " " end) as $prefix |
        (if $l.type == "add" then "     " else ($l.old_line | pad(4)) + " " end) as $old |
        (if $l.type == "delete" then "     " else ($l.new_line | pad(4)) + " " end) as $new |
        "  " + $prefix + " " + $old + "│" + $new + "│ " + $l.content
      )
    ),
    ""
  )
'
