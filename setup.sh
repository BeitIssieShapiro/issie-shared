#!/bin/bash
# Initial setup script for issie-shared Android deployment
set -e

echo "🔧 Setting up issie-shared Android deployment..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_ROOT="$SCRIPT_DIR"

# Check Ruby installation
if ! command -v ruby &> /dev/null; then
  echo "❌ Ruby is not installed"
  echo "Please install Ruby first: https://www.ruby-lang.org/en/downloads/"
  exit 1
fi

echo "✅ Ruby $(ruby -v | cut -d' ' -f2) found"

# Check Bundler installation
if ! command -v bundle &> /dev/null; then
  echo "📦 Installing Bundler..."
  gem install bundler
fi

echo "✅ Bundler found"

# Configure bundler to install to local vendor directory
echo "🔧 Configuring Bundler..."
cd "$SHARED_ROOT/android"
bundle config set --local path 'vendor/bundle'

# Install dependencies
echo "📦 Installing Ruby gems to vendor/bundle..."
bundle install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure release-admin-creds.json is in android/fastlane/"
echo "2. From any project, run: npm run deploy:android:<project>"
echo ""
echo "Example from IssieBoardNG:"
echo "  npm run deploy:android:issieboard"
echo "  npm run deploy:android:issievoice"

