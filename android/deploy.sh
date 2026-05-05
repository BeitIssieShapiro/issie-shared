#!/bin/bash
# Generic Android deployment script for all Issie projects
# Usage: /path/to/issie-shared/android/deploy.sh <project_name> <package_name> <flavor>
#
# Examples:
#   ./deploy.sh issieboard org.issieshapiro.issieboard issieboard
#   ./deploy.sh issievoice org.issieshapiro.issievoice issievoice

set -e

# Parse arguments
PROJECT_NAME=$1
PACKAGE_NAME=$2
FLAVOR=${3}  # Optional - if empty, project doesn't use flavors

if [ -z "$PROJECT_NAME" ] || [ -z "$PACKAGE_NAME" ]; then
  echo "Usage: $0 <project_name> <package_name> [flavor]"
  echo ""
  echo "Examples:"
  echo "  $0 issieboard org.issieshapiro.issieboard issieboard    # Multi-flavor project"
  echo "  $0 issiesays org.issieshapiro.issiesays                 # Single-flavor project (no flavor)"
  echo ""
  exit 1
fi

echo "🚀 Deploying $PROJECT_NAME to Google Play Internal Track..."
echo "   Package: $PACKAGE_NAME"
echo "   Flavor: $FLAVOR"
echo ""

# Determine paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_ROOT="$SCRIPT_DIR"  # This is already issie-shared/android
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"

echo "📂 Project root: $PROJECT_ROOT"
echo "📂 Shared root: $SHARED_ROOT"
echo ""

# Check for shared credentials
if [ ! -f "$SHARED_ROOT/fastlane/release-admin-creds.json" ]; then
  echo "❌ Error: release-admin-creds.json not found in $SHARED_ROOT/fastlane/"
  echo "Please copy credentials to issie-shared/android/fastlane/"
  echo "See UPLOAD_KEYS_SETUP.md for details"
  exit 1
fi

# Check for shared keystore
if [ ! -f "$SHARED_ROOT/keys/uploadkeystore.jks" ]; then
  echo "❌ Error: uploadkeystore.jks not found in $SHARED_ROOT/keys/"
  echo "Please copy the keystore to issie-shared/android/keys/"
  echo "See UPLOAD_KEYS_SETUP.md for details"
  exit 1
fi

# Check for signing config in project
if [ ! -f "$PROJECT_ROOT/android/gradle.properties" ]; then
  echo "❌ Error: android/gradle.properties not found in project"
  echo "Please ensure gradle.properties is configured"
  exit 1
fi

# Check for version.properties in project
if [ ! -f "$PROJECT_ROOT/android/version.properties" ]; then
  echo "❌ Error: android/version.properties not found in project"
  echo "Please create version.properties with:"
  echo "  $PROJECT_NAME.versionCode=1"
  echo "  $PROJECT_NAME.versionName=1.0"
  exit 1
fi

# Install project dependencies if needed
if [ -f "$PROJECT_ROOT/package.json" ]; then
  echo "📦 Installing project dependencies..."
  cd "$PROJECT_ROOT"
  npm install
  cd "$SHARED_ROOT"
fi

# Clean Gradle to ensure fresh JS bundle (avoids stale cached bundles)
echo "🧹 Cleaning Gradle build cache..."
cd "$PROJECT_ROOT/android"
./gradlew clean
cd "$SHARED_ROOT"

echo ""
echo "🔨 Building and deploying using shared Fastlane..."
echo ""

# Run shared fastlane
cd "$SHARED_ROOT"

# Build fastlane command - only pass flavor if provided
if [ -n "$FLAVOR" ]; then
  bundle exec fastlane deploy_android \
    project_root:"$PROJECT_ROOT" \
    project_name:"$PROJECT_NAME" \
    package_name:"$PACKAGE_NAME" \
    flavor:"$FLAVOR"
else
  # No flavor - single-app project
  bundle exec fastlane deploy_android \
    project_root:"$PROJECT_ROOT" \
    project_name:"$PROJECT_NAME" \
    package_name:"$PACKAGE_NAME" \
    flavor:"default"
fi

echo ""
echo "✅ Deployment complete for $PROJECT_NAME!"
echo ""
echo "Next steps:"
echo "1. Go to Google Play Console"
echo "2. Find the draft release in Internal Testing"
echo "3. Review and publish when ready"
