# Adding a New Project - Two Options

When adding a new Issie project, you can choose between two approaches:

---

## Option 1: Direct Call (Recommended, Simplest)

**No project-specific script needed!** Just call `deploy.sh` directly from npm.

### Steps

1. **Add npm script** to `package.json`:
   ```json
   {
     "scripts": {
       "deploy:android:myapp": "PROJECT_ROOT=$(pwd) ../../issie-shared/android/deploy.sh myapp org.issieshapiro.myapp"
     }
   }
   ```

2. **Create version file** (`android/version.properties`):
   ```properties
   myapp.versionCode=1
   myapp.versionName=1.0
   ```

3. **Update `android/app/build.gradle`** to read versions and apply shared signing:

   a. Add version properties loader before `android {` block:
   ```gradle
   // Load version properties
   def versionPropsFile = file('../../android/version.properties')
   def versionProps = new Properties()
   if (versionPropsFile.exists()) {
       versionProps.load(new FileInputStream(versionPropsFile))
   }
   ```

   b. Update `defaultConfig` to use dynamic versions:
   ```gradle
   defaultConfig {
       applicationId "org.issieshapiro.myapp"
       // ... other config ...
       versionCode versionProps['myapp.versionCode']?.toInteger() ?: 1
       versionName versionProps['myapp.versionName'] ?: "1.0"
   }
   ```

   c. Ensure release buildType uses release signing (NOT debug!):
   ```gradle
   buildTypes {
       release {
           signingConfig signingConfigs.release  // Critical!
           minifyEnabled enableProguardInReleaseBuilds
           proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
       }
   }
   ```

   d. **Apply shared signing at the end of the file** (after dependencies):
   ```gradle
   // Apply shared signing configuration from issie-shared
   // This must be AFTER the android { } block
   apply from: "../../../issie-shared/android/keys/apply-signing.gradle"
   ```

4. **Add project to signing config** in `issie-shared/android/keys/signing-config.properties`:
   ```properties
   # Add your project to the appropriate keystore group
   issie.main.projects=issieboard,issievoice,issiesays,myapp
   ```
**Done!** Now run:
```bash
npm run deploy:android:myapp
```

### Pros/Cons

✅ **Zero extra files** - no project-specific script needed
✅ **Simplest** - just one npm script line
✅ **Perfect for CI/CD** - direct call, no indirection
⚠️ Package name in `package.json` (need to update if it changes)

---

## Option 2: Thin Wrapper (More Flexible)

**Create a minimal wrapper** that maps flavors to package names.

### Steps

1. **Create wrapper** (`scripts/deploy-android.sh`):
   ```bash
   #!/bin/bash
   set -e

   FLAVOR=$1

   if [ -z "$FLAVOR" ]; then
     echo "Usage: ./scripts/deploy-android.sh [myapp|otherapp]"
     exit 1
   fi

   PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
   SHARED_DEPLOY="../../issie-shared/android/deploy.sh"

   # Map flavors to package names
   case $FLAVOR in
     myapp)
       PACKAGE_NAME="org.issieshapiro.myapp"
       ;;
     otherapp)
       PACKAGE_NAME="org.issieshapiro.otherapp"
       ;;
     *)
       echo "Unknown flavor: $FLAVOR"
       exit 1
       ;;
   esac

   export PROJECT_ROOT
   "$SHARED_DEPLOY" "$FLAVOR" "$PACKAGE_NAME"
   ```

   ```bash
   chmod +x scripts/deploy-android.sh
   ```

2. **Add npm scripts** to `package.json`:
   ```json
   {
     "scripts": {
       "deploy:android:myapp": "scripts/deploy-android.sh myapp",
       "deploy:android:otherapp": "scripts/deploy-android.sh otherapp"
     }
   }
   ```

3. **Create version file** (`android/version.properties`):
   ```properties
   myapp.versionCode=1
   myapp.versionName=1.0
   otherapp.versionCode=1
   otherapp.versionName=1.0
   ```

4. **Update gradle.properties** to use shared keystore:
   ```properties
   ISSIE_UPLOAD_STORE_FILE=../../issie-shared/android/keys/uploadkeystore.jks
   ISSIE_UPLOAD_KEY_ALIAS=key0
   ISSIE_UPLOAD_STORE_PASSWORD=issiesays
   ISSIE_UPLOAD_KEY_PASSWORD=issiesays
   ```

**Done!** Now run:
```bash
npm run deploy:android:myapp
npm run deploy:android:otherapp
```

### Pros/Cons

✅ **Centralized mapping** - flavor-to-package logic in one place
✅ **Validation** - can add custom checks before deployment
✅ **Multiple flavors** - easy to support many apps in one repo
⚠️ Extra file to maintain (~30 lines)

---

## Comparison

| Aspect | Option 1 (Direct) | Option 2 (Wrapper) |
|--------|-------------------|-------------------|
| **Files needed** | 0 extra files | 1 script file |
| **Lines of code** | 1 line in package.json | ~30 lines in wrapper |
| **Package name location** | package.json | scripts/deploy-android.sh |
| **Multiple flavors** | Multiple npm scripts | One script, case statement |
| **Custom validation** | Not possible | Easy to add |
| **Best for** | Single app, CI/CD | Multi-flavor projects |

---

## Recommendation

- **Simple projects (1-2 apps)**: Use **Option 1** (Direct Call)
- **Multi-flavor projects (3+ apps)**: Use **Option 2** (Wrapper)
- **CI/CD pipelines**: Use **Option 1** (Direct Call)

---

## IssieBoardNG Example (Uses Option 2)

IssieBoardNG has two apps (IssieBoard and IssieVoice) in one repo, so it uses the wrapper approach:

```bash
# scripts/deploy-android.sh maps:
#   issieboard → org.issieshapiro.issieboard
#   issievoice → org.issieshapiro.issievoice

npm run deploy:android:issieboard
npm run deploy:android:issievoice
```

---

## Both Options Call the Same Shared Logic

No matter which option you choose, both ultimately call:

```
issie-shared/android/deploy.sh
  ↓
issie-shared/android/fastlane/Fastfile
  ↓
Google Play
```

**Same behavior, same result!** Choose the approach that fits your project. 🚀
