import { Linking, Platform } from 'react-native';
import {
    checkPackage, identifyPackage, listPackageEntries, PACKAGE_FORMAT, readPackageManifest,
    showPackageCheckAlert, stampPackage, storeUrl,
} from '../src/package-manifest';
import { buildZip, memFs } from '../test-utils/zip-helpers';

jest.mock('../src/issie-alert', () => ({ issieAlert: jest.fn() }));
const { issieAlert } = jest.requireMock('../src/issie-alert');

const ZIP = '/tmp/p.zip';

function fsWith(entries: Record<string, string>, opts = {}, comment = '') {
    const fs = memFs(opts);
    fs.files.set(ZIP, buildZip(entries, comment));
    return fs;
}

describe('listPackageEntries', () => {
    test('reads entry names from the central directory', async () => {
        const fs = fsWith({ 'a.json': '{}', 'face_0.jpg': 'x', 'sub/b.txt': 'y' });
        expect(await listPackageEntries(fs, ZIP)).toEqual(['a.json', 'face_0.jpg', 'sub/b.txt']);
    });

    test('returns [] for an empty zip and undefined-safe for a non zip', async () => {
        expect(await listPackageEntries(fsWith({}), ZIP)).toEqual([]);
        const fs = memFs();
        fs.files.set(ZIP, Buffer.from('not a zip at all, just some text bytes'));
        expect(await listPackageEntries(fs, ZIP)).toEqual([]);
    });
});

describe('stampPackage / readPackageManifest', () => {
    test.each([
        ['whole-file access', {}],
        ['positional access', { positional: true }],
        ['positional access that fails (new arch) falls back', { brokenPositional: true }],
    ])('round trip with %s', async (_label, opts) => {
        const fs = fsWith({ 'metadata__x.json': '{"buttons":[]}' }, opts);
        await stampPackage(fs, ZIP, { app: 'issiesays', kind: 'profile', appVersion: '1.2.3' });

        const manifest = await readPackageManifest(fs, ZIP);
        expect(manifest).toMatchObject({ issie: PACKAGE_FORMAT, app: 'issiesays', kind: 'profile', appVersion: '1.2.3' });
        expect(new Date(manifest!.created!).toString()).not.toBe('Invalid Date');
        // the zip is still readable after stamping
        expect(await listPackageEntries(fs, ZIP)).toEqual(['metadata__x.json']);
    });

    test('non-ascii values survive (kept as \\u escapes in the comment)', async () => {
        const fs = fsWith({ 'x.metadata': '' });
        await stampPackage(fs, ZIP, { app: 'issiedocs', kind: 'דף עבודה' });
        const raw = fs.files.get(ZIP)!.toString('latin1');
        expect(raw).toMatch(/\\u05d3/);
        expect((await readPackageManifest(fs, ZIP))!.kind).toBe('דף עבודה');
    });

    test('refuses a zip that already has a comment, and a non zip', async () => {
        const fs = fsWith({ 'a.txt': 'a' }, {}, 'made by someone');
        await expect(stampPackage(fs, ZIP, { app: 'issiedice', kind: 'dice' })).rejects.toThrow(/already has a comment/);

        const bad = memFs();
        bad.files.set(ZIP, Buffer.from('short'));
        await expect(stampPackage(bad, ZIP, { app: 'issiedice', kind: 'dice' })).rejects.toThrow(/Not a zip/);
    });

    test('ignores packages without a manifest, or with a foreign/garbled comment', async () => {
        expect(await readPackageManifest(fsWith({ 'a.txt': 'a' }), ZIP)).toBeUndefined();
        expect(await readPackageManifest(fsWith({ 'a.txt': 'a' }, {}, 'hello'), ZIP)).toBeUndefined();
        expect(await readPackageManifest(fsWith({ 'a.txt': 'a' }, {}, 'issie-package:{oops'), ZIP)).toBeUndefined();
        expect(await readPackageManifest(fsWith({ 'a.txt': 'a' }, {}, 'issie-package:{"issie":"1"}'), ZIP)).toBeUndefined();
    });
});

describe('identifyPackage (legacy layouts, no manifest)', () => {
    const reader = (files: Record<string, string>) => async (name: string) => files[name];

    test.each<[string, Record<string, string>, boolean, object | undefined]>([
        ['IssieAlbum album', { 'export.metadata': '{}', 'p1.json': '' }, false, { app: 'issiealbum', kind: 'album' }],
        ['IssieAlbum backup', { 'backup.metadata': '{"exportType":"backup"}' }, true, { app: 'issiealbum', kind: 'backup' }],
        ['IssieDocs backup', { 'backup.metadata': '{"backup":true}' }, true, { app: 'issiedocs', kind: 'backup' }],
        ['a backup without reader', { 'backup.metadata': '{}' }, false, { candidates: ['issiedocs', 'issiealbum'], kind: 'backup' }],
        ['IssieDocs worksheet', { 'abc-2024.metadata': '{}', 'page1.jpg': '' }, false, { app: 'issiedocs' }],
        ['IssieCalc profile', { 'metadata__p.json': '{"app":"issiecalc"}' }, true, { app: 'issiecalc', kind: 'profile' }],
        ['IssieSays profile', { 'metadata__p.json': '{"buttons":[]}' }, true, { app: 'issiesays', kind: 'profile' }],
        ['a shared-layout profile without reader', { 'metadata__p.json': '' }, false,
            { candidates: ['issiesays', 'issieboard', 'issievoice', 'issiecalc'], kind: 'profile' }],
        ['IssieDice die', { 'r4nd.json': '{"type":"dice"}', 'face_0.jpg': '' }, true, { app: 'issiedice', kind: 'dice' }],
        ['IssieDice die without reader', { 'r4nd.json': '', 'face_0.json': '' }, false, { app: 'issiedice', kind: 'dice' }],
        ['IssieDice profile', { 'r4nd.json': '{"type":"profile","dice":[]}' }, true, { app: 'issiedice', kind: 'profile' }],
        ['IssieDice profile bundle', { 'profile__x.dice': '', 'cube.dice': '' }, false, { app: 'issiedice', kind: 'profile' }],
    ])('%s', async (_label, entries, withReader, expected) => {
        const id = await identifyPackage(fsWith(entries), ZIP, withReader ? reader(entries) : undefined);
        expect(id).toMatchObject({ source: 'legacy', ...expected });
    });

    test('skips nested and hidden entries (e.g. __MACOSX, .DS_Store)', async () => {
        const id = await identifyPackage(fsWith({ '__MACOSX/export.metadata': '', '.DS_Store': '', 'note.txt': '' }), ZIP);
        expect(id).toBeUndefined();
    });

    test('a manifest wins over the layout', async () => {
        const fs = fsWith({ 'export.metadata': '{}' });
        await stampPackage(fs, ZIP, { app: 'issiedocs', kind: 'worksheet' });
        expect(await identifyPackage(fs, ZIP)).toMatchObject({ app: 'issiedocs', kind: 'worksheet', source: 'manifest' });
    });
});

describe('checkPackage', () => {
    test('accepts own packages and rejects another app\'s', async () => {
        const fs = fsWith({ 'export.metadata': '{}' });
        expect(await checkPackage(fs, ZIP, 'issiealbum')).toMatchObject({ ok: true });
        expect(await checkPackage(fs, ZIP, 'issiedocs')).toEqual({ ok: false, reason: 'other-app', app: 'issiealbum', candidates: ['issiealbum'] });
    });

    test('acceptedApps lets the IssieBoard family share profiles', async () => {
        const entries = { 'metadata__p.json': '{"app":"issievoice"}' };
        const readEntry = async (n: string) => (entries as any)[n];
        expect((await checkPackage(fsWith(entries), ZIP, 'issieboard', { readEntry })).ok).toBe(false);
        expect((await checkPackage(fsWith(entries), ZIP, 'issieboard', { readEntry, acceptedApps: ['issievoice', 'issiecalc'] })).ok).toBe(true);
    });

    test('ambiguous legacy layouts are accepted when the app is one of the candidates', async () => {
        expect((await checkPackage(fsWith({ 'metadata__p.json': '' }), ZIP, 'issiesays')).ok).toBe(true);
    });

    test('rejects a package made with a newer format', async () => {
        const comment = 'issie-package:' + JSON.stringify({ issie: PACKAGE_FORMAT + 1, app: 'issiedice', kind: 'dice' });
        const res = await checkPackage(fsWith({ 'a.json': '' }, {}, comment), ZIP, 'issiedice');
        expect(res).toMatchObject({ ok: false, reason: 'newer-format' });
    });

    test('never blocks when the file cannot be read or identified', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        expect(await checkPackage(memFs(), '/missing.zip', 'issiedocs')).toEqual({ ok: true });
        expect(await checkPackage(fsWith({ 'readme.txt': '' }), ZIP, 'issiedocs')).toEqual({ ok: true });
    });
});

describe('storeUrl / showPackageCheckAlert', () => {
    afterEach(() => { (Platform as any).OS = 'ios'; jest.clearAllMocks(); });

    test('store links per platform', () => {
        expect(storeUrl('issiedice')).toBe('https://apps.apple.com/app/id1349312738');
        (Platform as any).OS = 'android';
        expect(storeUrl('issiedice')).toBe('https://play.google.com/store/apps/details?id=com.issiedice');
    });

    test('another app\'s file offers cancel, get app and open in', async () => {
        const share = jest.fn(async () => { });
        showPackageCheckAlert({ ok: false, reason: 'other-app', app: 'issiesays', candidates: ['issiesays'] }, ZIP, 'issiedice', share);
        const [, msg, buttons] = issieAlert.mock.calls[0];
        expect(msg).toContain('IssieSays');
        expect(buttons).toHaveLength(3);
        buttons[1].onPress();
        expect(Linking.openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id6477746107');
        buttons[2].onPress();
        expect(share).toHaveBeenCalledWith(ZIP);
    });

    test('unknown origin shows a message only; newer format offers an update of the current app', () => {
        showPackageCheckAlert({ ok: false, reason: 'other-app', candidates: ['issiedocs', 'issiealbum'] }, ZIP, 'issiesays', jest.fn());
        expect(issieAlert.mock.calls[0]).toHaveLength(2);

        showPackageCheckAlert({ ok: false, reason: 'newer-format', manifest: { issie: 9, app: 'issiesays', kind: 'x' } }, ZIP, 'issiesays', jest.fn());
        issieAlert.mock.calls[1][2][1].onPress();
        expect(Linking.openURL).toHaveBeenCalledWith(storeUrl('issiesays'));
    });
});
