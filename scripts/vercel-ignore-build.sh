#!/bin/bash

# Vercel Ignored Build Step script
# Returns exit code 1 to BUILD, exit code 0 to SKIP build.

echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"
echo "VERCEL_GIT_COMMIT_MESSAGE: $VERCEL_GIT_COMMIT_MESSAGE"

# 1. Always build production
if [ "$VERCEL_ENV" = "production" ] || [ "$VERCEL_GIT_COMMIT_REF" = "main" ] || [ "$VERCEL_GIT_COMMIT_REF" = "master" ]; then
  echo "✅ Production branch detected - Proceeding with build."
  exit 1
fi

# 2. Check for manual override flags in commit message
if [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[build\]" ]] || [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[deploy\]" ]] || [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[ci\]" ]]; then
  echo "✅ Force build flag detected in commit message - Proceeding with build."
  exit 1
fi

if [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[skip\]" ]] || [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[skip-ci\]" ]] || [[ "$VERCEL_GIT_COMMIT_MESSAGE" =~ "\[no-build\]" ]]; then
  echo "🛑 Skip build flag detected in commit message - Cancelling build."
  exit 0
fi

# 3. For preview branches, check if core application files changed
CHANGED_APP_FILES=$(git diff --name-only HEAD^ HEAD 2>/dev/null | grep -E '^(app/|components/|lib/|public/|styles/|package\.json|next\.config\.)' || true)

if [ -n "$CHANGED_APP_FILES" ]; then
  echo "✅ App files changed - Proceeding with preview build."
  exit 1
fi

# If HEAD^ doesn't exist or git diff fails, default to building safely
echo "✅ Default build fallback - Proceeding with build."
exit 1
