/**
 * Tells which Issie app made an exported .zip package, so an app can reject another
 * app's file and offer to open it in the right one.
 *
 * The manifest is kept in the zip's comment, not as a file inside it. Older app
 * versions pick their metadata by file name (IssieDice takes the first *.json,
 * IssieDocs moves every non-.metadata file into the worksheet folder, IssieSign
 * expects exactly one file), so an extra file would break or pollute their imports.
 * Unzippers ignore the comment, and email/WhatsApp pass the bytes through unchanged.
 *
 * Packages made before this have no comment; identifyPackage() then falls back to
 * each app's known file layout.
 */
import { Linking, Platform } from 'react-native';
import { issieAlert } from './issie-alert';
import { fTranslate, translate } from './lang';

export type IssieAppId =
    | 'issiesays'
    | 'issiedocs'
    | 'issiealbum'
    | 'issieboard'
    | 'issievoice'
    | 'issiecalc'
    | 'issiedice';

export interface IssieAppInfo {
    id: IssieAppId;
    name: string;
    iosBundleId: string;
    androidPackage: string;
    appStoreId: string;
}

export const ISSIE_APPS: Record<IssieAppId, IssieAppInfo> = {
    issiesays: { id: 'issiesays', name: 'IssieSays', iosBundleId: 'org.issieshapiro.issiesays', androidPackage: 'com.IssieSays', appStoreId: '6477746107' },
    issiedocs: { id: 'issiedocs', name: 'IssieDocs', iosBundleId: 'com.issieshapiro.issiedoc.IssieDoc', androidPackage: 'org.issieshapiro.issiedocs', appStoreId: '1469032311' },
    issiealbum: { id: 'issiealbum', name: 'IssieAlbum', iosBundleId: 'org.issieshapiro.issieAlbums', androidPackage: 'org.issieshapiro.issiealbum', appStoreId: '6758858045' },
    issieboard: { id: 'issieboard', name: 'IssieBoard', iosBundleId: 'com.issieshapiro.Issieboard', androidPackage: 'org.issieshapiro.issieboard', appStoreId: '1074352181' },
    issievoice: { id: 'issievoice', name: 'IssieVoice', iosBundleId: 'org.issieshapiro.IssieVoice', androidPackage: 'org.issieshapiro.issievoice', appStoreId: '6759102492' },
    issiecalc: { id: 'issiecalc', name: 'IssieCalc', iosBundleId: 'com.issieshapiro.IssieCalc', androidPackage: 'org.issieshapiro.issiecalc', appStoreId: '1424402084' },
    issiedice: { id: 'issiedice', name: 'IssieDice', iosBundleId: 'com.issieshapiro.IssieDice', androidPackage: 'com.issiedice', appStoreId: '1349312738' },
};

export function storeUrl(app: IssieAppId): string {
    const info = ISSIE_APPS[app];
    return Platform.OS === 'android'
        ? `https://play.google.com/store/apps/details?id=${info.androidPackage}`
        : `https://apps.apple.com/app/id${info.appStoreId}`;
}

/** Bump when a change would make older apps misread a package. */
export const PACKAGE_FORMAT = 1;

export interface PackageManifest {
    /** package format version, see PACKAGE_FORMAT */
    issie: number;
    app: IssieAppId;
    /** app-defined, e.g. "profile", "backup", "worksheet", "album" */
    kind: string;
    appVersion?: string;
    /** ISO date */
    created?: string;
}

/**
 * The file functions used here, as in react-native-fs and @dr.pogodin/react-native-fs.
 * Pass the module itself: `stampPackage(RNFS, path, ...)`.
 */
export interface PackageFs {
    stat(path: string): Promise<{ size: number | string }>;
    readFile(path: string, encoding: 'base64'): Promise<string>;
    writeFile(path: string, contents: string, encoding: 'base64'): Promise<void>;
    appendFile(path: string, contents: string, encoding: 'base64'): Promise<void>;
    read?(path: string, length: number, position: number, encoding: 'base64'): Promise<string>;
    write?(path: string, contents: string, position: number, encoding: 'base64'): Promise<void>;
}

// react-native-fs 2.x read()/write() with a position fail under the new architecture
// ("NSInteger is unsupported"), so fall back to whole-file calls once they do
const noPositionalAccess = new WeakSet<PackageFs>();

/** `length` bytes from `position` */
async function readRange(fs: PackageFs, path: string, length: number, position: number): Promise<Uint8Array> {
    if (fs.read && !noPositionalAccess.has(fs)) {
        try {
            return toBytes(await fs.read(path, length, position, 'base64'));
        } catch {
            noPositionalAccess.add(fs);
        }
    }
    // decode only the base64 groups (3 bytes each) that cover the range
    const b64 = await fs.readFile(path, 'base64');
    const first = Math.floor(position / 3);
    const bytes = toBytes(b64.substring(first * 4, Math.ceil((position + length) / 3) * 4));
    return bytes.subarray(position - first * 3, position - first * 3 + length);
}

/** Writes `bytes` over the file from `position` to its end, then appends `append` */
async function replaceTail(fs: PackageFs, path: string, position: number, bytes: Uint8Array, append: Uint8Array) {
    if (fs.write && !noPositionalAccess.has(fs)) {
        try {
            await fs.write(path, toBase64(bytes), position, 'base64');
            await fs.appendFile(path, toBase64(append), 'base64');
            return;
        } catch {
            noPositionalAccess.add(fs);
        }
    }
    // keep the untouched base64 groups as they are, re-encode only from the group holding `position`
    const b64 = await fs.readFile(path, 'base64');
    const first = Math.floor(position / 3);
    const groupStart = toBytes(b64.substring(first * 4)).subarray(0, position - first * 3);
    const tail = new Uint8Array(groupStart.length + bytes.length + append.length);
    tail.set(groupStart);
    tail.set(bytes, groupStart.length);
    tail.set(append, groupStart.length + bytes.length);
    await fs.writeFile(path, b64.substring(0, first * 4) + toBase64(tail), 'base64');
}

const COMMENT_PREFIX = 'issie-package:';
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const EOCD_SIZE = 22;
const MAX_COMMENT = 0xffff;

function toBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function toBase64(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

function asciiToBytes(s: string): Uint8Array {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
}

function bytesToText(bytes: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    try {
        return decodeURIComponent(escape(bin)); // utf8
    } catch {
        return bin;
    }
}

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

interface ZipEnd {
    /** file offset of the end-of-central-directory record */
    eocdOffset: number;
    centralDirSize: number;
    centralDirOffset: number;
    comment: Uint8Array;
}

/** Finds the end-of-central-directory record, which holds the comment, at the end of the file. */
async function readZipEnd(fs: PackageFs, zipPath: string): Promise<ZipEnd | undefined> {
    const size = Number((await fs.stat(zipPath)).size);
    if (size < EOCD_SIZE) return undefined;
    const tailLength = Math.min(size, EOCD_SIZE + MAX_COMMENT);
    const tailStart = size - tailLength;
    const tail = await readRange(fs, zipPath, tailLength, tailStart);

    for (let i = tail.length - EOCD_SIZE; i >= 0; i--) {
        if (u32(tail, i) !== EOCD_SIGNATURE) continue;
        const commentLength = u16(tail, i + 20);
        if (i + EOCD_SIZE + commentLength !== tail.length) continue; // a signature lookalike inside data
        return {
            eocdOffset: tailStart + i,
            centralDirSize: u32(tail, i + 12),
            centralDirOffset: u32(tail, i + 16),
            comment: tail.subarray(i + EOCD_SIZE),
        };
    }
    return undefined;
}

/**
 * Writes the manifest into a zip the app just created. Call it after zip() and before sharing.
 * The zip must not have a comment yet (zips made by react-native-zip-archive don't).
 */
export async function stampPackage(fs: PackageFs, zipPath: string, manifest: Omit<PackageManifest, 'issie'>): Promise<void> {
    const end = await readZipEnd(fs, zipPath);
    if (!end) throw new Error('Not a zip file: ' + zipPath);
    if (end.comment.length > 0) throw new Error('Zip already has a comment: ' + zipPath);

    const full: PackageManifest = { issie: PACKAGE_FORMAT, created: new Date().toISOString(), ...manifest };
    // keep the comment ascii, non-ascii chars become \uXXXX escapes (still valid JSON)
    const text = COMMENT_PREFIX + JSON.stringify(full).replace(/[\u0080-￿]/g,
        c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    const comment = asciiToBytes(text);
    if (comment.length > MAX_COMMENT) throw new Error('Manifest too long');

    // the comment length is the last field of the record, i.e. the file's last 2 bytes
    await replaceTail(fs, zipPath, end.eocdOffset + 20, new Uint8Array([comment.length & 0xff, comment.length >> 8]), comment);
}

/** The manifest stamped by stampPackage(), or undefined for older packages and other zips. */
export async function readPackageManifest(fs: PackageFs, zipPath: string): Promise<PackageManifest | undefined> {
    const end = await readZipEnd(fs, zipPath);
    if (!end || end.comment.length === 0) return undefined;
    const text = bytesToText(end.comment);
    if (!text.startsWith(COMMENT_PREFIX)) return undefined;
    try {
        const manifest = JSON.parse(text.substring(COMMENT_PREFIX.length));
        if (typeof manifest?.issie !== 'number' || typeof manifest.app !== 'string') return undefined;
        return manifest;
    } catch {
        return undefined;
    }
}

/** Names of the entries in a zip, read from its central directory without unzipping. */
export async function listPackageEntries(fs: PackageFs, zipPath: string): Promise<string[]> {
    const end = await readZipEnd(fs, zipPath);
    if (!end || end.centralDirSize === 0 || end.centralDirOffset === 0xffffffff) return []; // empty or zip64
    const dir = await readRange(fs, zipPath, end.centralDirSize, end.centralDirOffset);

    const names: string[] = [];
    let i = 0;
    while (i + 46 <= dir.length && u32(dir, i) === CENTRAL_DIR_SIGNATURE) {
        const nameLength = u16(dir, i + 28);
        const extraLength = u16(dir, i + 30);
        const commentLength = u16(dir, i + 32);
        names.push(bytesToText(dir.subarray(i + 46, i + 46 + nameLength)));
        i += 46 + nameLength + extraLength + commentLength;
    }
    return names;
}

export interface PackageIdentity {
    /** the app that made the package, when known */
    app?: IssieAppId;
    /** the apps it may come from, when the old layout is shared by several */
    candidates: IssieAppId[];
    kind?: string;
    source: 'manifest' | 'legacy';
    manifest?: PackageManifest;
}

const BOARD_FAMILY: IssieAppId[] = ['issieboard', 'issievoice', 'issiecalc'];

const fromApp = (app: IssieAppId, kind?: string): PackageIdentity => ({ app, candidates: [app], kind, source: 'legacy' });
const fromCandidates = (candidates: IssieAppId[], kind?: string): PackageIdentity => ({ candidates, kind, source: 'legacy' });

async function readJson(readEntry: ((name: string) => Promise<string | undefined>) | undefined, name: string): Promise<any> {
    if (!readEntry) return undefined;
    try {
        const text = await readEntry(name);
        return text ? JSON.parse(text) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Which app made a package: from its manifest, or else from the file layout each app used
 * before manifests. Pass `readEntry` (reads a top-level file of the unzipped package) to tell
 * apart layouts that only differ by content; without it, those return several candidates.
 * Returns undefined when nothing matches, e.g. a backup made only of inner zips.
 */
export async function identifyPackage(
    fs: PackageFs,
    zipPath: string,
    readEntry?: (name: string) => Promise<string | undefined>,
): Promise<PackageIdentity | undefined> {
    const manifest = await readPackageManifest(fs, zipPath);
    if (manifest) {
        return { app: manifest.app, candidates: [manifest.app], kind: manifest.kind, source: 'manifest', manifest };
    }

    const names = (await listPackageEntries(fs, zipPath))
        .filter(n => !n.includes('/') && !n.startsWith('.')); // top level only, skip __MACOSX/.DS_Store

    if (names.includes('export.metadata')) return fromApp('issiealbum', 'album');

    if (names.includes('backup.metadata')) {
        // IssieDocs writes {"backup":true}, IssieAlbum {"exportType":"backup",...}
        const md = await readJson(readEntry, 'backup.metadata');
        if (md?.exportType) return fromApp('issiealbum', 'backup');
        if (md?.backup) return fromApp('issiedocs', 'backup');
        return fromCandidates(['issiedocs', 'issiealbum'], 'backup');
    }

    // IssieDocs worksheet or folder: "<random>-<date>.metadata"
    if (names.some(n => n.endsWith('.metadata'))) return fromApp('issiedocs');

    // IssieSays and the IssieBoard family: "metadata__<name>.json"
    const sharedMetadata = names.find(n => n.startsWith('metadata__') && n.endsWith('.json'));
    if (sharedMetadata) {
        const md = await readJson(readEntry, sharedMetadata);
        if (md && BOARD_FAMILY.includes(md.app)) return fromApp(md.app, 'profile');
        if (md && Array.isArray(md.buttons)) return fromApp('issiesays', 'profile');
        return fromCandidates(['issiesays', ...BOARD_FAMILY], 'profile');
    }

    // IssieDice: "<random>.json" with a type, next to face*.json files
    const diceMetadata = names.find(n => n.endsWith('.json') && !n.startsWith('face'));
    if (diceMetadata) {
        const md = await readJson(readEntry, diceMetadata);
        if (md?.type === 'dice' || (md?.type === 'profile' && Array.isArray(md.dice))) return fromApp('issiedice', md.type);
        if (!readEntry && names.some(n => n.startsWith('face'))) return fromApp('issiedice', 'dice');
    }
    if (names.some(n => n.endsWith('.dice'))) return fromApp('issiedice', 'profile');

    return undefined;
}

export type PackageCheck =
    | { ok: true; identity?: PackageIdentity }
    | { ok: false; reason: 'other-app'; app?: IssieAppId; candidates: IssieAppId[] }
    | { ok: false; reason: 'newer-format'; manifest: PackageManifest };

/**
 * Whether `currentApp` should import the package. An unidentified package is allowed
 * (as is one that cannot be read),
 * so the app's own legacy import (and its errors) still run.
 * `acceptedApps` lets an app also accept packages of related apps (e.g. the IssieBoard family).
 */
export async function checkPackage(
    fs: PackageFs,
    zipPath: string,
    currentApp: IssieAppId,
    options: { acceptedApps?: IssieAppId[]; readEntry?: (name: string) => Promise<string | undefined> } = {},
): Promise<PackageCheck> {
    let identity: PackageIdentity | undefined;
    try {
        identity = await identifyPackage(fs, zipPath, options.readEntry);
    } catch (e) {
        // never block an import because the package could not be inspected
        console.log('checkPackage: cannot inspect package', zipPath, e);
        return { ok: true };
    }
    if (!identity) return { ok: true };

    const accepted = [currentApp, ...(options.acceptedApps ?? [])];
    if (!identity.candidates.some(app => accepted.includes(app))) {
        return { ok: false, reason: 'other-app', app: identity.app, candidates: identity.candidates };
    }
    if (identity.manifest && identity.manifest.issie > PACKAGE_FORMAT) {
        return { ok: false, reason: 'newer-format', manifest: identity.manifest };
    }
    return { ok: true, identity };
}

/**
 * Tells the user why a package was not imported (with issieAlert: mount <IssieAlertHost/>
 * for the app's text direction). For another app's file it offers to open
 * it there (`share` opens the share sheet with the file, e.g. react-native-share's Share.open)
 * and to get that app from the store.
 */
export function showPackageCheckAlert(
    check: Exclude<PackageCheck, { ok: true }>,
    zipPath: string,
    currentApp: IssieAppId,
    share: (zipPath: string) => Promise<unknown>,
) {
    if (check.reason === 'newer-format') {
        issieAlert(translate('PkgNewerTitle'), translate('PkgNewerMsg'), [
            { text: translate('BtnCancel'), style: 'cancel' },
            { text: translate('PkgUpdate'), onPress: () => Linking.openURL(storeUrl(currentApp)) },
        ]);
        return;
    }

    const app = check.app ?? (check.candidates.length === 1 ? check.candidates[0] : undefined);
    if (!app) {
        issieAlert(translate('PkgOtherAppTitle'), translate('PkgUnknownAppMsg'));
        return;
    }
    const name = ISSIE_APPS[app].name;
    issieAlert(translate('PkgOtherAppTitle'), fTranslate('PkgOtherAppMsg', name), [
        { text: translate('BtnCancel'), style: 'cancel' },
        { text: fTranslate('PkgGetApp', name), onPress: () => Linking.openURL(storeUrl(app)) },
        { text: fTranslate('PkgOpenIn', name), onPress: () => share(zipPath).catch(() => { }) },
    ]);
}
