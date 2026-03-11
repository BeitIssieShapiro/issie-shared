# Issie Shared
A shared repo for common controls, APIs, and deployment tooling for Issie apps.

---

## 🚀 Android Deployment (Shared Fastlane)

### Directory Structure

```
issie-shared/
└── android/              # Shared Android deployment configuration
    ├── fastlane/         # Shared Fastlane for Google Play uploads
    │   ├── Fastfile      # Generic deployment lanes
    │   ├── Appfile       # Fastlane configuration
    │   └── release-admin-creds.json  # Google Play API credentials (gitignored)
    ├── keys/
    │   └── uploadkeystore.jks        # Upload signing key (gitignored)
    ├── deploy.sh         # Generic deployment script
    ├── Gemfile           # Ruby dependencies
    └── README.md
```

### Setup (One-time)

```bash
cd issie-shared/android
bundle install
```

### Usage from Projects

**From IssieBoardNG:**
```bash
npm run deploy:android:issieboard  # Deploy IssieBoard
npm run deploy:android:issievoice  # Deploy IssieVoice
```

**Adding to new projects:**
1. Create `scripts/deploy-android.sh` (see IssieBoardNG example)
2. Add npm scripts:
   ```json
   "deploy:android:myapp": "scripts/deploy-android.sh myapp"
   ```
3. Add to `android/version.properties`:
   ```properties
   myapp.versionCode=1
   myapp.versionName=1.0
   ```

### What's Shared

✅ Fastlane deployment logic (no duplication!)
✅ Deployment script (`deploy.sh` - generic for all projects)
✅ Google Play credentials (same for all apps)
✅ **Centralized signing configuration** (NEW! - no per-project keystore paths)
✅ Upload keystores (same signing keys for all apps)
✅ Version management strategy
✅ Build and upload process

**NEW: Centralized Signing!**
Projects just add one line: `apply from: "../../../issie-shared/android/keys/apply-signing.gradle"`
No more keystore paths or passwords in project files!

See `CENTRALIZED_SIGNING.md` and `android/README.md` for detailed documentation.

---

## 📦 NPM Package (React Native Components)

### How to install
`npm install @beitissieshapiro/issie-shared`

but before, you need to configure github as a source for this org:

- create a .npmrc file with this:
```
@beitissieshapiro:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```
- create a hithub personal-access-token (classic) with packages-read permission
- `export GITHUB_TOKEN=<your pat>

## How to publish a new version
- modify package.json version field
- push to github
- create a new release --> this will trigger an action which will publish a new version of the package