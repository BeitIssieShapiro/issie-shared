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

### 2. Configure Centralized Signing

Create `signing-config.properties` from the example:

```bash
cp signing-config.properties.example signing-config.properties
```

Edit `signing-config.properties` with your keystore details:

```properties
# Main Issie apps keystore
issie.main.storeFile=uploadkeystore.jks
issie.main.keyAlias=key0
issie.main.storePassword=issiesays
issie.main.keyPassword=issiesays

# List all projects using this keystore
issie.main.projects=issieboard,issievoice,issiesays

# Add more keystore groups as needed
# issie.docs.storeFile=issiedocs-uploadkeystore.jks
# issie.docs.projects=issiedocs,issiereader
```

### 3. Apply to Projects

Each project needs ONE line at the end of `android/app/build.gradle`:

```gradle
// Apply shared signing configuration from issie-shared
// This must be AFTER the android { } block
apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
```

That's it! The `apply-signing.gradle` script automatically:
- Detects the project name
- Finds the right keystore group
- Loads signing configuration

**No per-project keystore paths or passwords needed!**

## Key Details

- **Main Keystore Group**: `issie.main`
- **Key Alias**: `key0`
- **Passwords**: `issiesays` (for both store and key)
- **Format**: Java Keystore (JKS)
- **Usage**: Configured per keystore group in `signing-config.properties`

## Security Notes

✅ **Centralized**: All signing config in ONE place (`signing-config.properties`)
✅ **Gitignored**: Never committed to repository (both keystores and config)
✅ **Backup**: Store securely in 1Password or similar
✅ **Upload key**: Used by Google Play for app signing (Google re-signs with their own key)
✅ **Multiple keystores**: Support different keystores for different project groups

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

To verify the keystore is accessible and projects load it correctly:

```bash
# Check keystore details
keytool -list -v -keystore issie-shared/android/keys/uploadkeystore.jks -storepass issiesays

# Check if project loads signing config
cd /path/to/project/android
./gradlew app:signingReport
```

You should see:
```
✅ Loaded signing config for 'projectname' from keystore group 'main'
   Keystore: uploadkeystore.jks
```

## Projects Using This Keystore

Configured in `signing-config.properties`:

- ✅ IssieBoardNG (IssieBoard + IssieVoice)
- ✅ IssieSays
- Add your project by editing `issie.main.projects` in `signing-config.properties`

## Multiple Keystores

If you need different keystores for different project groups:

1. Add the keystore file to this directory:
   ```bash
   cp /path/to/other-keystore.jks issie-shared/android/keys/
   ```

2. Add a new group to `signing-config.properties`:
   ```properties
   issie.docs.storeFile=other-keystore.jks
   issie.docs.keyAlias=key0
   issie.docs.storePassword=password
   issie.docs.keyPassword=password
   issie.docs.projects=issiedocs,issiereader
   ```

Projects will automatically use the correct keystore based on their name!
