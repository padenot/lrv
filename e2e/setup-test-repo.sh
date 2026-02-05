#!/bin/bash
set -e

# Create a temporary test repository
TEST_REPO="$1"

if [ -z "$TEST_REPO" ]; then
  echo "Usage: $0 <test-repo-path>"
  exit 1
fi

# Clean up if it exists
rm -rf "$TEST_REPO"

# Create test repo
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"

# Initialize git
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Create initial files
cat > test.txt << 'EOF'
line 1
line 2
line 3
EOF

cat > file2.txt << 'EOF'
function foo() {
  return 42;
}
EOF

cat > file3.txt << 'EOF'
import { something } from 'somewhere';

export const bar = 'baz';
EOF

# Commit initial version
git add test.txt file2.txt file3.txt
git commit -m "Initial commit"

# Modify files to create diff
cat > test.txt << 'EOF'
line 1
line 2 modified
line 3
line 4 added
EOF

cat > file2.txt << 'EOF'
function foo() {
  console.log('debug');
  return 42;
}
EOF

cat > file3.txt << 'EOF'
import { something } from 'somewhere';
import { another } from 'elsewhere';

export const bar = 'baz';
export const qux = 'quux';
EOF

echo "Test repository created at $TEST_REPO"
echo "Run 'git diff HEAD' in that directory to see the test diff"
