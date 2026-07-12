#!/usr/bin/env bash
set -e

# ---------------------------------------------------------------------------
# Bootstrap for the TEF/TCF Canada Simulator project
# Run this INSIDE the folder that already contains CLAUDE.md, README.md, etc.
# ---------------------------------------------------------------------------

echo "Creating folder structure..."

mkdir -p app
mkdir -p content/tef/expression_ecrite
mkdir -p content/tcf/expression_ecrite
mkdir -p docs
mkdir -p prisma
mkdir -p src/components
mkdir -p src/lib

# Basic .gitignore for a Next.js + Prisma project
cat > .gitignore << 'INNER'
node_modules/
.next/
.env
.env.local
*.db
*.db-journal
dist/
.DS_Store
INNER

echo "Structure created:"
find . -maxdepth 2 -type d -not -path './.git*'

echo ""
echo "Initializing local git repository..."
git init -b main
git add .
git commit -m "chore: initial project scaffold (CLAUDE.md, docs/data-schema.md, licenses)"

echo ""
echo "=========================================================================="
echo "Local repository ready. To create the remote GitHub repository:"
echo ""
echo "OPTION A — using the GitHub CLI (recommended, if 'gh' is already installed/logged in):"
echo "  gh repo create tef-tcf-simulator --public --source=. --remote=origin --push"
echo ""
echo "OPTION B — manually:"
echo "  1. Create an empty repository at https://github.com/new (e.g. tef-tcf-simulator)"
echo "  2. Run:"
echo "     git remote add origin https://github.com/YOUR_USERNAME/tef-tcf-simulator.git"
echo "     git push -u origin main"
echo "=========================================================================="
