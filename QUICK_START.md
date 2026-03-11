# Quick Start Checklist

## First Time Setup

- [ ] Navigate to `issie-shared/` directory
- [ ] Run `./setup.sh` to install Ruby dependencies
- [ ] Copy `release-admin-creds.json` to `android/fastlane/`
- [ ] Copy `uploadkeystore.jks` to `android/keys/`
- [ ] Verify with: `cd android && bundle exec fastlane --version`

## Required Files (gitignored)

These files must be copied from secure storage (1Password, etc.):

```bash
issie-shared/android/
├── fastlane/release-admin-creds.json    # Google Play API credentials
├── keys/uploadkeystore.jks              # Upload signing key
└── keys/signing-config.properties       # Signing configuration
```

Copy the example signing config and fill in your values:
```bash
cd issie-shared/android/keys
cp signing-config.properties.example signing-config.properties
# Edit signing-config.properties with your keystore info
```

**IMPORTANT**: Never commit these files!

## Deploy IssieBoard or IssieVoice

From the `IssieBoardNG` directory:

```bash
# Deploy IssieBoard
npm run deploy:android:issieboard

# Deploy IssieVoice
npm run deploy:android:issievoice
```

## What Gets Deployed

- ✅ Uploaded to **Google Play Internal Track**
- ✅ Created as **DRAFT** (not published automatically)
- ✅ Version code auto-incremented
- ✅ Version bump committed to git

## After Deploy

1. Go to Google Play Console
2. Find the draft release in Internal Testing track
3. Review the AAB
4. Publish when ready

## Files Modified on Each Deploy

- `android/version.properties` - Version code incremented
- Git commit created: "Bump {project} version for release"

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  IssieBoardNG Project                   │
│  ├── npm run deploy:android:issieboard │
│  └── scripts/deploy-android.sh         │
└──────────────────┬──────────────────────┘
                   │ calls with params
                   ▼
┌─────────────────────────────────────────┐
│  issie-shared/android                   │
│  ├── Fastfile (generic lanes)          │
│  ├── release-admin-creds.json (shared) │
│  └── vendor/bundle (Ruby gems)         │
└─────────────────────────────────────────┘
```

**Benefits:**
- 🎯 Single source of truth for deployment
- 🔒 Shared credentials and keystore for all Issie apps
- 🚀 Easy to add new projects
- 📦 No code duplication

## Common Setup Issues

### Issue: "AAB signed with wrong key"
**Solution**: Check `android/app/build.gradle` release buildType:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release  // NOT debug!
    }
}
```

### Issue: "Version code X has already been used"
**Solution**: Ensure `build.gradle` reads from `version.properties`:
```gradle
// Add before android { block
def versionPropsFile = file('../../android/version.properties')
def versionProps = new Properties()
if (versionPropsFile.exists()) {
    versionProps.load(new FileInputStream(versionPropsFile))
}

// In defaultConfig:
versionCode versionProps['myapp.versionCode']?.toInteger() ?: 1
versionName versionProps['myapp.versionName'] ?: "1.0"
```

### Issue: "Keystore file not found"
**Solution**: Ensure keystore is in `issie-shared/android/keys/` and listed in `signing-config.properties`:
```properties
issie.main.storeFile=uploadkeystore.jks
issie.main.projects=issieboard,issievoice,issiesays
```

Projects automatically load signing from this centralized config.
