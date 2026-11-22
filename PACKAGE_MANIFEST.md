# Package manifest: which app made this zip

All Issie apps export `.zip` files, so one app can be handed another app's export.
`src/package-manifest.ts` lets an app tell whose file it is, reject it, and offer to open it in the right app.

## Where the manifest lives: the zip comment

The manifest is written into the zip's **comment** field (`issie-package:{json}`), not as a file in the zip.
A file inside the zip would break older app versions:

| App | How its import picks files today | What an extra `issie-package.json` would do |
|---|---|---|
| IssieDice | first `*.json` not starting with `face` is the metadata | may be picked as the metadata → "Unknown package type" |
| IssieDocs | first `*.metadata`; **moves every other file** into the worksheet folder | left behind in the user's folder (hidden, as it ends with `.json`) |
| IssieSign | exactly one file (`fileList.json`) | "wrong import file" |
| IssieSays, IssieBoard | `metadata__*.json`, else imports inner `.zip`s | ignored |
| IssieAlbum | `export.metadata` / `backup.metadata` | ignored |

Unzippers ignore the comment, and email/WhatsApp pass the bytes through unchanged.
Tested: a stamped zip still passes `unzip -t` and opens with Python's zipfile; entries and manifest read back correctly, including Hebrew.

## API

All file access goes through the app's own fs module (`react-native-fs` or `@dr.pogodin/react-native-fs`), passed as the first argument.
It uses `read`/`write` at a position when they work. In react-native-fs 2.x they fail under the new architecture, so the module falls back to `readFile`/`writeFile` of the whole file, which is native and fast.

- `stampPackage(fs, zipPath, { app, kind, appVersion })`: call right after `zip()`, before sharing.
- `checkPackage(fs, zipPath, currentApp, { acceptedApps?, readEntry? })`: call before importing.
  It returns `{ ok: true }`, or `{ ok: false, reason: 'other-app' | 'newer-format', ... }`.
- `showPackageCheckAlert(check, zipPath, currentApp, share)`: the user-facing message.
  For another app's file it shows **Get &lt;App&gt;** (store link) and **Open in &lt;App&gt;** (share sheet, so the user picks that app).
- `identifyPackage`, `readPackageManifest`, `listPackageEntries` (entry names read without unzipping), `ISSIE_APPS`, `storeUrl`.

Packages without a manifest (everything exported so far) are identified by their old layout:

| Layout | App |
|---|---|
| `export.metadata` | IssieAlbum album |
| `backup.metadata` containing `exportType` | IssieAlbum backup |
| `backup.metadata` containing `{"backup":true}` | IssieDocs backup |
| other `*.metadata` | IssieDocs worksheet or folder |
| `metadata__*.json` with `app` | IssieBoard / IssieVoice / IssieCalc |
| `metadata__*.json` with `buttons` | IssieSays |
| `*.json` with `type: "dice"`, or `"profile"` with `dice` | IssieDice |

Telling some of these apart needs the file content; pass `readEntry` (reads a top-level file of the unzipped package) for that.
Without it, a shared layout returns several candidates, and the check lets it through when the current app is one of them.
A backup made only of inner zips is not identified, and the check lets it through to the app's own import.

## Adding it to an app (IssieSays as the example)

```ts
import { stampPackage, checkPackage, showPackageCheckAlert } from '@beitissieshapiro/issie-shared';

// export, after zip():
await stampPackage(RNFS, zipPath, { app: 'issiesays', kind: 'profile', appVersion: getVersion() });

// import, before importPackage():
const check = await checkPackage(RNFS, path, 'issiesays');
if (!check.ok) {
    showPackageCheckAlert(check, path, 'issiesays', p => Share.open({ url: 'file://' + p }));
    return;
}
```

- The IssieBoard family passes `acceptedApps: ['issieboard', 'issievoice', 'issiecalc']` if they share profiles.
- On Android, pass a local file path: copy a `content://` URI to a temp file first, as IssieAlbum does.
- Stamping the outer zip is enough. Inner zips of a backup can be stamped too, but don't need to be.

## Existing cross-app problems found while checking

1. **IssieDice imports an IssieSays profile as a dice profile.** Both use `type: "profile"`, so IssieDice saves a broken profile with no dice.
2. **IssieSays tries to import an IssieBoard profile** (same `metadata__` naming). It fails, and the user only sees it as a failed profile.
3. **IssieSays and IssieDice import nothing from another app's zip, without saying why.** IssieDice also tries to unzip every file of a backup, not only the `.zip` files.
4. **IssieDocs and IssieAlbum both name their backup metadata `backup.metadata`.** IssieAlbum tells them apart by content; IssieDocs rejects an IssieAlbum backup as invalid, which is correct.

Calling `checkPackage` before importing fixes 1–3 for files that can be identified.

## Not covered

- **IssieSign** shares a base64 data-URL zip read with JSZip, a separate flow. JSZip can read and write the comment (`zip.comment`, `generateAsync({ comment })`), so it can join later.
- **Direct hand-off between apps** (no share sheet): Android can send the file straight to the app's package with an intent. On iOS that needs an App Group shared by all the apps plus a URL scheme in each; none of the apps define one today.
