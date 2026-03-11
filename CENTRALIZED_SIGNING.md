# Centralized Signing Configuration

## Overview

All Issie Android projects now use centralized signing configuration instead of per-project keystore paths and passwords.

## Benefits

✅ **No duplication**: Keystore paths and passwords in ONE place
✅ **Easy updates**: Change keystore once, applies to all projects
✅ **Multiple keystores**: Support different keystores for different project groups
✅ **Secure**: Passwords never in project files
✅ **Simple**: Projects just apply one gradle script

## How It Works

### 1. Central Configuration

`issie-shared/android/keys/signing-config.properties`:
```properties
# Main keystore for IssieBoard apps
issie.main.storeFile=uploadkeystore.jks
issie.main.keyAlias=key0
issie.main.storePassword=issiesays
issie.main.keyPassword=issiesays
issie.main.projects=issieboard,issievoice,issiesays

# Additional keystore groups...
issie.docs.storeFile=issiedocs-uploadkeystore.jks
issie.docs.keyAlias=key0
issie.docs.storePassword=password
issie.docs.keyPassword=password
issie.docs.projects=issiedocs,issiereader
```

### 2. Auto-Loading Script

`issie-shared/android/keys/apply-signing.gradle`:
- Reads the signing config
- Detects project name from package ID
- Finds the right keystore group
- Applies signing configuration automatically

### 3. Project Integration

Projects just add ONE line to `android/app/build.gradle`:
```gradle
// At the end of the file, after android { } block
apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
```

## Migration from Old Setup

### Before (per-project):
```properties
# android/gradle.properties (in EACH project)
MYAPP_RELEASE_STORE_FILE=../../../issie-shared/android/keys/uploadkeystore.jks
MYAPP_RELEASE_KEY_ALIAS=key0
MYAPP_RELEASE_STORE_PASSWORD=issiesays
MYAPP_RELEASE_KEY_PASSWORD=issiesays
```

```gradle
// android/app/build.gradle (in EACH project)
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
}
```

### After (centralized):
```properties
# issie-shared/android/keys/signing-config.properties (ONE file)
issie.main.storeFile=uploadkeystore.jks
issie.main.keyAlias=key0
issie.main.storePassword=issiesays
issie.main.keyPassword=issiesays
issie.main.projects=issieboard,issievoice,issiesays,myapp
```

```gradle
// android/app/build.gradle (ONE line per project)
apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
```

## Adding a New Project

1. **Add to signing config** in `issie-shared/android/keys/signing-config.properties`:
   ```properties
   issie.main.projects=issieboard,issievoice,issiesays,mynewapp
   ```

2. **Apply shared signing** in project's `android/app/build.gradle`:
   ```gradle
   apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
   ```

Done! The project will automatically use the correct keystore.

## Multiple Keystores

If different projects need different keystores:

```properties
# Main apps
issie.main.storeFile=uploadkeystore.jks
issie.main.projects=issieboard,issievoice,issiesays

# Docs apps (different keystore)
issie.docs.storeFile=docs-keystore.jks
issie.docs.projects=issiedocs,issiereader

# Enterprise apps (another keystore)
issie.enterprise.storeFile=enterprise-keystore.jks
issie.enterprise.projects=issieenterprise
```

The `apply-signing.gradle` script automatically detects which group each project belongs to.

## Verification

Build log will show:
```
✅ Loaded signing config for 'issiesays' from keystore group 'main'
   Keystore: uploadkeystore.jks
```

Or run:
```bash
./gradlew app:signingReport
```

## Security

- `signing-config.properties` is gitignored
- Contains passwords, never commit
- Store backup in 1Password or secure location
- Same security model as before, but centralized

## Troubleshooting

**Error: "No keystore group found for project 'myapp'"**
- Add `myapp` to a project list in `signing-config.properties`

**Error: "Keystore file not found"**
- Ensure keystore file is in `issie-shared/android/keys/`
- Filename matches `storeFile` property

**Error: "NullPointerException" during signing**
- Ensure `apply from` is AFTER the `android { }` block
- Check that `signingConfigs.release` is defined (can be empty)
