# Shared Fastlane Deployment Setup - Summary

## ✅ What Was Created

### In `issie-shared/android/`:

```
issie-shared/
├── android/
│   ├── fastlane/
│   │   ├── Fastfile                     # Generic deployment lanes (SHARED)
│   │   ├── Appfile                      # Fastlane configuration
│   │   ├── release-admin-creds.json     # Google Play API credentials (✅ copied, gitignored)
│   │   └── README.md                    # Fastlane documentation
│   ├── keys/
│   │   ├── uploadkeystore.jks           # Upload signing key (SHARED, gitignored)
│   │   └── README.md                    # Keystore documentation
│   ├── deploy.sh                        # Shared deployment script (GENERIC)
│   ├── Gemfile                          # Ruby dependencies
│   ├── .gitignore                       # Excludes credentials, keys & vendor/
│   └── README.md                        # Android deployment guide
├── setup.sh                             # Setup script (installs dependencies)
└── README.md                            # Updated with deployment info
```

### In `IssieBoardNG/`:

```
IssieBoardNG/
├── scripts/deploy-android.sh            # Thin wrapper, calls shared deploy.sh
├── android/
│   ├── gradle.properties                # Updated to use shared keystore path
│   └── SHARED_FASTLANE.md               # Usage guide for this project
```

## 🚀 How to Use

### Initial Setup (Run Once)

```bash
cd issie-shared
./setup.sh
```

This installs Ruby gems to `vendor/bundle` (avoiding system permission issues).

**Then copy shared files:**

```bash
# Copy Google Play API credentials
cp /path/to/release-admin-creds.json android/fastlane/

# Copy upload keystore
cp /path/to/uploadkeystore.jks android/keys/
```

These files are gitignored. Store backups securely (1Password, etc.).

### Deploy from IssieBoardNG

```bash
# From IssieBoardNG directory
npm run deploy:android:issieboard    # Deploy IssieBoard
npm run deploy:android:issievoice    # Deploy IssieVoice
```

### What Happens on Deploy

1. ✅ Verifies git status is clean
2. 📈 Increments version code in `android/version.properties`
3. 🔨 Builds release AAB bundle
4. ☁️ Uploads to Google Play Internal Track as **DRAFT**
5. 💾 Commits version bump to git

## 🎯 Benefits

✅ **Zero code duplication**: All Issie projects share one Fastlane implementation
✅ **Shared credentials**: One `release-admin-creds.json` for all apps
✅ **Shared signing key**: One `uploadkeystore.jks` for all Issie apps
✅ **Easy maintenance**: Update deployment logic once, applies everywhere
✅ **Consistent process**: Same workflow for IssieBoard, IssieVoice, and future apps
✅ **Simple commands**: Just `npm run deploy:android:<project>`

## 📦 Adding New Projects

To use shared Fastlane from a new Issie project:

1. **Add npm script** to `package.json` - call the shared `deploy.sh` directly:
   ```json
   "deploy:android:myapp": "PROJECT_ROOT=$(pwd) ../issie-shared/android/deploy.sh myapp org.issieshapiro.myapp"
   ```
   myapp being e.g. issiedocs

2. **Create version file** (`android/version.properties`):
   ```properties
   myapp.versionCode=1
   myapp.versionName=1.0
   ```

3. **Update `android/app/build.gradle` to read versions from properties**:

   Add this before the `android {` block:
   ```gradle
   // Load version properties
   def versionPropsFile = file('../../android/version.properties')
   def versionProps = new Properties()
   if (versionPropsFile.exists()) {
       versionProps.load(new FileInputStream(versionPropsFile))
   }
   ```

   Then in `defaultConfig`, change:
   ```gradle
   defaultConfig {
       // ... other config ...
       versionCode versionProps['myapp.versionCode']?.toInteger() ?: 1
       versionName versionProps['myapp.versionName'] ?: "1.0"
   }
   ```

   And ensure release buildType uses release signing:
   ```gradle
   buildTypes {
       release {
           signingConfig signingConfigs.release  // NOT signingConfigs.debug!
           // ... other config ...
       }
   }
   ```

4. **Apply shared signing configuration** at the end of `android/app/build.gradle`:
   ```gradle
   // Apply shared signing configuration from issie-shared
   // This must be AFTER the android { } block
   apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
   ```

5. **Add your project to the signing config** in `issie-shared/android/keys/signing-config.properties`:
   ```properties
   # Add 'myapp' to the projects list
   issie.main.projects=issieboard,issievoice,issiesays,myapp
   ```

That's it! The shared `deploy.sh`, Fastlane, and signing configuration handle everything else.

**No more per-project signing properties needed!** All signing is centralized in `issie-shared/android/keys/signing-config.properties`.

## 🔒 Security

- `release-admin-creds.json` is in `.gitignore` (never committed)
- `uploadkeystore.jks` is in `.gitignore` (never committed)
- Same service account and signing key used by all Issie projects
- Store backups in secure location (1Password, etc.)

## 📚 Documentation

- **issie-shared/android/README.md**: Shared Android deployment overview
- **issie-shared/android/keys/README.md**: Keystore documentation and setup
- **issie-shared/android/fastlane/README.md**: Fastlane lane details
- **IssieBoardNG/android/SHARED_FASTLANE.md**: Project-specific usage guide

## 🧪 Testing

To test the setup without uploading:

```bash
# Dry run (just build, don't upload)
cd issie-shared/android
bundle exec fastlane deploy_android \
  project_root:/Users/i022021/dev/Issie/IssieBoardNG \
  project_name:issieboard \
  package_name:org.issieshapiro.issieboard \
  flavor:issieboard \
  # Add --verbose for detailed logs
```

## 🆘 Troubleshooting

**Bundle install fails with permissions:**
```bash
cd issie-shared/android
bundle config set --local path 'vendor/bundle'
bundle install
```

**Missing credentials:**
```bash
ls issie-shared/android/fastlane/release-admin-creds.json
ls issie-shared/android/keys/uploadkeystore.jks
# If missing, copy from secure storage (1Password, etc.)
```

**AAB not found:**
- Check flavor name matches build.gradle
- Ensure version.properties has correct entries
- Run gradle clean: `cd android && ./gradlew clean`

---

## 🎉 Result

You now have a **centralized, maintainable deployment system** that:
- Eliminates code duplication across Issie projects
- Uses shared credentials and signing keys in one location
- Makes adding new projects trivial
- Keeps deployment logic in sync across all apps

**No more copying Fastlane files or keystores between projects!** 🚀
