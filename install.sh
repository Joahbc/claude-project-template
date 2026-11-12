#!/usr/bin/env bash
# Links the template's skills and personal rules into ~/.claude.
# Safe to re-run. Never overwrites a real file without backing it up first.
set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR/skills"

link() {
  local src="$1" dest="$2"
  if [ -L "$dest" ]; then
    rm "$dest"
  elif [ -e "$dest" ]; then
    mv "$dest" "$dest.backup-$(date +%Y%m%d%H%M%S)"
    echo "Backed up existing $dest"
  fi
  ln -s "$src" "$dest"
  echo "Linked $dest"
}

# Skills: /kickoff and /retro
for skill in "$TEMPLATE_DIR"/skills/*/; do
  name="$(basename "$skill")"
  link "${skill%/}" "$CLAUDE_DIR/skills/$name"
done

# Personal rules and craft principles for all projects
link "$TEMPLATE_DIR/user/CLAUDE.md" "$CLAUDE_DIR/CLAUDE.md"
link "$TEMPLATE_DIR/user/STYLE.md" "$CLAUDE_DIR/STYLE.md"

# Tell the skills where the template lives
echo "$TEMPLATE_DIR" > "$CLAUDE_DIR/project-template-path"
echo "Template path saved: $TEMPLATE_DIR"

echo
echo "Done. Restart Claude Code, then run /kickoff in an empty project folder."
echo "If Superpowers isn't installed yet, run inside Claude Code:"
echo "  /plugin install superpowers@claude-plugins-official"
