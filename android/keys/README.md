# Shared Android Signing Keys

## Structure

All Issie Android projects share the same signing keys:

```
issie-shared/android/
├── keys/
│   ├── uploadkeystore.jks           # Upload signing key (SHARED, gitignored)
│   └── README.md                    # This file
└── fastlane/
    └── release-admin-creds.json     # Google Play API credentials (SHARED, gitignored)
```

## Setup

### 1. Store the Upload Keystore

Place your `uploadkeystore.jks` in this directory:

```bash
# Copy from secure storage (1Password, etc.) or existing project
cp /path/to/uploadkeystore.jks issie-shared/android/keys/
```

**IMPORTANT**: This file is gitignored and should NEVER be committed to the repository.

### 2. Configure Projects to Use Shared Keystore

Each project's `android/gradle.properties` should reference the shared keystore:

```properties
# --- Release Signing Configuration ---
# Path to shared keystore (relative to android/ directory)
ISSIE_UPLOAD_STORE_FILE=../../issie-shared/android/keys/uploadkeystore.jks
ISSIE_UPLOAD_KEY_ALIAS=key0
ISSIE_UPLOAD_STORE_PASSWORD=issiesays
ISSIE_UPLOAD_KEY_PASSWORD=issiesays
```

### 3. Update build.gradle (if needed)

Your `android/app/build.gradle` should already have this config:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('ISSIE_UPLOAD_STORE_FILE')) {
            storeFile file(ISSIE_UPLOAD_STORE_FILE)
            storePassword ISSIE_UPLOAD_STORE_PASSWORD
            keyAlias ISSIE_UPLOAD_KEY_ALIAS
            keyPassword ISSIE_UPLOAD_KEY_PASSWORD
        }
    }
}
```

## Key Details

- **Key Alias**: `key0`
- **Passwords**: `issiesays` (for both store and key)
- **Format**: Java Keystore (JKS)
- **Usage**: All Issie Android apps (IssieBoard, IssieVoice, IssieDice, etc.)

## Security Notes

✅ **Shared across projects**: Same key for all Issie apps (this is fine!)
✅ **Gitignored**: Never committed to repository
✅ **Backup**: Store securely in 1Password or similar
✅ **Upload key**: Used by Google Play for app signing (Google re-signs with their own key)

## Creating a New Keystore (if needed)

If you need to generate a new keystore:

```bash
keytool -genkeypair -v \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias key0 \
  -keystore uploadkeystore.jks \
  -storepass issiesays \
  -keypass issiesays \
  -dname "CN=Issie Shapiro, OU=Development, O=Beit Issie Shapiro, L=Raanana, ST=Israel, C=IL"
```

**NOTE**: Only needed if you don't have an existing keystore. Using an existing one maintains continuity with published apps.

## Verification

To verify the keystore is accessible:

```bash
keytool -list -v -keystore issie-shared/android/keys/uploadkeystore.jks -storepass issiesays
```

## Projects Using This Keystore

- ✅ IssieBoardNG (IssieBoard + IssieVoice)
- Add your project here...
