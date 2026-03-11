# 📋 Setup Checklist for Upload Keys

## Where Everything Lives

```
issie-shared/android/
├── fastlane/
│   └── release-admin-creds.json         ← Google Play API credentials (GITIGNORED)
└── keys/
    ├── uploadkeystore.jks               ← Upload signing key (GITIGNORED)
    ├── signing-config.properties        ← Signing configuration (GITIGNORED)
    └── apply-signing.gradle             ← Auto-loading script (committed)
```

## Initial Setup Steps

### 1. Copy the Upload Keystore

**From secure storage (1Password, etc.):**
```bash
cp /path/to/uploadkeystore.jks issie-shared/android/keys/
```

### 2. Copy Google Play Credentials

**From secure storage:**
```bash
cp /path/to/release-admin-creds.json issie-shared/android/fastlane/
```

### 3. Create Signing Configuration

**Create from example:**
```bash
cd issie-shared/android/keys
cp signing-config.properties.example signing-config.properties
```

**Edit `signing-config.properties`:**
```properties
# Main Issie apps keystore
issie.main.storeFile=uploadkeystore.jks
issie.main.keyAlias=key0
issie.main.storePassword=issiesays
issie.main.keyPassword=issiesays
issie.main.projects=issieboard,issievoice,issiesays
```

### 4. Verify Files

```bash
ls -la issie-shared/android/keys/uploadkeystore.jks
ls -la issie-shared/android/fastlane/release-admin-creds.json
ls -la issie-shared/android/keys/signing-config.properties
```

All three should exist. All three are gitignored.

## Per-Project Configuration

### Projects automatically load signing from centralized config!

Just add ONE line to the end of `android/app/build.gradle`:
```gradle
// Apply shared signing configuration from issie-shared
// This must be AFTER the android { } block
apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
```

Then add your project to `signing-config.properties`:
```properties
issie.main.projects=issieboard,issievoice,issiesays,myapp
```

**That's it!** No per-project keystore paths or passwords needed.

**✅ Already done for IssieBoardNG and IssieSays!**

## Key Information

| Property | Value |
|----------|-------|
| **Keystore File** | `uploadkeystore.jks` |
| **Key Alias** | `key0` |
| **Store Password** | `issiesays` |
| **Key Password** | `issiesays` |
| **Format** | Java Keystore (JKS) |
| **Used By** | All Issie Android apps |

## Security Notes

✅ **Shared**: Same keystore for all Issie projects (IssieBoard, IssieVoice, IssieDice, etc.)
✅ **Gitignored**: Never committed to git
✅ **Backed up**: Store securely in 1Password or equivalent
✅ **Upload key**: Google re-signs with their own key after upload

## Verifying the Keystore

To check the keystore is valid:

```bash
keytool -list -v \
  -keystore issie-shared/android/keys/uploadkeystore.jks \
  -storepass issiesays
```

You should see details about the `key0` alias.

## What If I Don't Have the Keystore?

**Option 1: Copy from existing project**
```bash
# If you have it in another Issie project
cp /path/to/IssieDice/android/app/uploadkeystore.jks issie-shared/android/keys/
```

**Option 2: Retrieve from 1Password or secure storage**
- Search for "Issie upload keystore" or similar
- Download and place in `issie-shared/android/keys/`

**Option 3: Generate new (NOT RECOMMENDED for existing apps)**
- Only do this for brand new apps
- Existing published apps MUST use the same keystore
- See `issie-shared/android/keys/README.md` for generation command

## Testing

After setup, test the deployment:

```bash
cd IssieBoardNG
npm run deploy:android:issieboard
```

The script will check for:
- ✅ Shared keystore exists
- ✅ Shared credentials exist
- ✅ Project gradle.properties configured

---

## Summary

**All Issie projects now share:**
1. 🔑 One upload keystore (`uploadkeystore.jks`)
2. 🔐 One Google Play API credential (`release-admin-creds.json`)
3. 🚀 One Fastlane deployment implementation

**No more:**
- ❌ Copying keystores between projects
- ❌ Duplicating credentials
- ❌ Maintaining multiple Fastlane configurations

**Just:**
- ✅ Copy files to `issie-shared/android/` once
- ✅ Reference from all projects
- ✅ Deploy with `npm run deploy:android:<project>`
