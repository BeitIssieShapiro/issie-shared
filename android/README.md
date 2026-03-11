# Shared Android Deployment for Issie Projects

This directory contains shared Fastlane configuration for all Issie Android projects.

## Directory Structure

```
issie-shared/android/
├── fastlane/
│   ├── Fastfile              # Generic deployment lanes
│   ├── Appfile               # Fastlane app configuration
│   ├── release-admin-creds.json  # Google Play API credentials (SHARED, gitignored)
│   └── README.md
├── keys/
│   ├── uploadkeystore.jks    # Upload signing key (SHARED, gitignored)
│   └── README.md             # Keystore documentation
├── deploy.sh                 # Shared deployment script (GENERIC, executable)
├── Gemfile                   # Ruby dependencies
├── .gitignore                # Protects credentials and keys
└── README.md                 # This file
```

## Setup

### 1. Install Ruby dependencies

```bash
cd issie-shared/android
bundle config set --local path 'vendor/bundle'
bundle install
```

Or use the setup script:

```bash
cd issie-shared
./setup.sh
```

### 2. Copy shared files (one-time setup)

**Google Play API credentials:**
```bash
cp /path/to/release-admin-creds.json fastlane/
```

**Upload keystore:**
```bash
cp /path/to/uploadkeystore.jks keys/
```

**IMPORTANT**: Both files are gitignored and should NEVER be committed. Store backups securely (1Password, etc.).

## Using from Projects

### Option 1: Direct Call (Recommended for CI/CD)

Call the shared `deploy.sh` directly:

```bash
cd /path/to/issie-shared/android
./deploy.sh issieboard org.issieshapiro.issieboard issieboard
```

Or from any directory with `PROJECT_ROOT` environment variable:

```bash
export PROJECT_ROOT=/Users/i022021/dev/Issie/IssieBoardNG
/path/to/issie-shared/android/deploy.sh issieboard org.issieshapiro.issieboard
```

### Option 2: Project Wrapper (Recommended for Development)

Create a thin wrapper in your project that calls the shared script:

`scripts/deploy-android.sh`:
```bash
#!/bin/bash
set -e

FLAVOR=$1
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED_DEPLOY="$(cd "$(dirname "$0")/../../issie-shared/android" && pwd)/deploy.sh"

case $FLAVOR in
  issieboard)
    PACKAGE_NAME="org.issieshapiro.issieboard"
    ;;
  issievoice)
    PACKAGE_NAME="org.issieshapiro.issievoice"
    ;;
esac

export PROJECT_ROOT
"$SHARED_DEPLOY" "$FLAVOR" "$PACKAGE_NAME" "$FLAVOR"
```

Then use npm scripts:
```json
"deploy:android:issieboard": "scripts/deploy-android.sh issieboard",
"deploy:android:issievoice": "scripts/deploy-android.sh issievoice"
```

### Project Configuration

Each project needs to:

1. **Read versions from properties** in `android/app/build.gradle`:

   Add before `android {` block:
   ```gradle
   def versionPropsFile = file('../../android/version.properties')
   def versionProps = new Properties()
   if (versionPropsFile.exists()) {
       versionProps.load(new FileInputStream(versionPropsFile))
   }
   ```

   Update `defaultConfig`:
   ```gradle
   versionCode versionProps['myapp.versionCode']?.toInteger() ?: 1
   versionName versionProps['myapp.versionName'] ?: "1.0"
   ```

2. **Use release signing** in buildTypes (critical!):
   ```gradle
   buildTypes {
       release {
           signingConfig signingConfigs.release  // NOT debug!
       }
   }
   ```

3. **Apply shared signing configuration** at the end of `android/app/build.gradle`:
   ```gradle
   // Apply shared signing configuration from issie-shared
   // This must be AFTER the android { } block
   apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
   ```

4. **Add project to signing config** in `issie-shared/android/keys/signing-config.properties`:
   ```properties
   # Main keystore group
   issie.main.projects=issieboard,issievoice,issiesays,myapp
   ```

**No per-project signing properties needed!** All signing configuration is centralized in `issie-shared/android/keys/signing-config.properties`.

## Projects Using This

- **IssieBoardNG**: `npm run deploy:android:issieboard` and `npm run deploy:android:issievoice`
- **Future projects**: Add similar npm scripts

## Benefits

✅ **Single source of truth**: All deployment logic in one place
✅ **Shared credentials**: One set of keys and API credentials for all projects
✅ **Shared signing key**: Same upload keystore for all Issie apps
✅ **Consistent versioning**: Same version bump strategy
✅ **Easy updates**: Fix once, applies to all projects
✅ **No duplicate code**: DRY principle across projects

## What's Shared

1. **Fastlane deployment logic** (`fastlane/Fastfile`)
2. **Google Play API credentials** (`fastlane/release-admin-creds.json`)
3. **Upload signing keystore** (`keys/uploadkeystore.jks`)

## Security

🔒 **Never commit**:
- `fastlane/release-admin-creds.json` - Google Play service account
- `keys/uploadkeystore.jks` - App signing key
- `vendor/` - Ruby gems directory
- `.bundle/` - Bundler config

All sensitive files are in `.gitignore`.
