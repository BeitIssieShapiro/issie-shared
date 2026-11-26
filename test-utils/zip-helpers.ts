/**
 * Builds small, valid (stored, uncompressed) zip files in memory, and a PackageFs
 * over an in-memory byte store, for the package-manifest tests.
 */
import type { PackageFs } from '../src/package-manifest';

const enc = (s: string) => Buffer.from(s, 'utf8');

function u16(n: number) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; }

export function buildZip(entries: Record<string, string>, comment = ''): Buffer {
    const locals: Buffer[] = [];
    const centrals: Buffer[] = [];
    let offset = 0;
    for (const [name, content] of Object.entries(entries)) {
        const n = enc(name);
        const data = enc(content);
        const local = Buffer.concat([
            u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0),
            u32(data.length), u32(data.length), u16(n.length), u16(0), n, data,
        ]);
        centrals.push(Buffer.concat([
            u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0),
            u32(data.length), u32(data.length), u16(n.length), u16(0), u16(0), u16(0), u16(0), u32(0),
            u32(offset), n,
        ]));
        locals.push(local);
        offset += local.length;
    }
    const cd = Buffer.concat(centrals);
    const c = Buffer.from(comment, 'latin1');
    const eocd = Buffer.concat([
        u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length),
        u32(cd.length), u32(offset), u16(c.length), c,
    ]);
    return Buffer.concat([...locals, cd, eocd]);
}

/** A PackageFs over a Map of path -> bytes. `positional` adds read()/write(); `brokenPositional` makes them throw. */
export function memFs(opts: { positional?: boolean; brokenPositional?: boolean } = {}) {
    const files = new Map<string, Buffer>();
    const fs: PackageFs & { files: Map<string, Buffer> } = {
        files,
        async stat(p) {
            const f = files.get(p);
            if (!f) throw new Error('ENOENT ' + p);
            return { size: String(f.length) }; // react-native-fs returns a string on some platforms
        },
        async readFile(p) {
            const f = files.get(p);
            if (!f) throw new Error('ENOENT ' + p);
            return f.toString('base64');
        },
        async writeFile(p, b64) { files.set(p, Buffer.from(b64, 'base64')); },
        async appendFile(p, b64) { files.set(p, Buffer.concat([files.get(p) ?? Buffer.alloc(0), Buffer.from(b64, 'base64')])); },
    };
    if (opts.positional || opts.brokenPositional) {
        fs.read = jest.fn(async (p: string, length: number, position: number) => {
            if (opts.brokenPositional) throw new Error('NSInteger is unsupported');
            return files.get(p)!.subarray(position, position + length).toString('base64');
        });
        fs.write = jest.fn(async (p: string, b64: string, position: number) => {
            if (opts.brokenPositional) throw new Error('NSInteger is unsupported');
            const cur = files.get(p)!;
            const data = Buffer.from(b64, 'base64');
            const out = Buffer.alloc(Math.max(cur.length, position + data.length));
            cur.copy(out);
            data.copy(out, position);
            files.set(p, out);
        });
    }
    return fs;
}
