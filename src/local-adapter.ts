import fs from 'fs-extra';
import path from 'path';

// --- Local Storage Adapter (R2 Emulation) ---
// Emula la API de Cloudflare R2 usando el sistema de archivos local.
// Esto permite que el código sea agnóstico a la infraestructura (Cloud vs Local).

// Definimos nuestra propia interfaz para evitar conflictos con R2Bucket estricto
export interface LocalBucketInterface {
    get(key: string): Promise<LocalObjectBody | null>;
    put(key: string, value: any, options?: any): Promise<LocalObject>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number }): Promise<{ objects: LocalObject[]; truncated: boolean; cursor?: string; delimitedPrefixes: string[] }>;
    head(key: string): Promise<LocalObject | null>;
}

export interface LocalObject {
    key: string;
    version: string;
    size: number;
    etag: string;
    httpEtag: string;
    uploaded: Date;
    storageClass: string;
    httpMetadata: Record<string, string>;
    customMetadata: Record<string, string>;
    checksums: Record<string, string>;
}

export interface LocalObjectBody extends LocalObject {
    body: Buffer;
    bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
    blob(): Promise<Blob>;
}

export class LocalBucket implements LocalBucketInterface {
    private storagePath: string;

    constructor(basePath: string = '.lobpoop_storage') {
        this.storagePath = path.resolve(process.cwd(), basePath);
        fs.ensureDirSync(this.storagePath);
    }

    private getPath(key: string): string {
        // Sanitizar key para evitar directory traversal
        const safeKey = key.replace(/\.\./g, '');
        return path.join(this.storagePath, safeKey);
    }

    // --- R2 API Implementation ---

    async get(key: string): Promise<LocalObjectBody | null> {
        const filePath = this.getPath(key);
        if (!fs.existsSync(filePath)) return null;

        const content = await fs.readFile(filePath);

        return {
            body: content,
            bodyUsed: false,
            arrayBuffer: async () => content.buffer as ArrayBuffer,
            text: async () => content.toString('utf-8'),
            json: async <T = unknown>() => JSON.parse(content.toString('utf-8')) as T,
            blob: async () => new Blob([content]),
            // Metadata
            key: key,
            version: "local-v1",
            size: content.length,
            etag: "local-etag",
            httpEtag: "local-etag",
            uploaded: new Date(),
            storageClass: "STANDARD",
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
        };
    }

    async put(key: string, value: any, _options?: any): Promise<LocalObject> {
        const filePath = this.getPath(key);
        await fs.ensureDir(path.dirname(filePath));

        // Handle different value types
        let content: string | Buffer;
        if (typeof value === 'string') {
            content = value;
        } else if (Buffer.isBuffer(value)) {
            content = value;
        } else if (value instanceof Uint8Array) {
            content = Buffer.from(value);
        } else {
            // Assume object, stringify
            content = JSON.stringify(value);
        }

        await fs.writeFile(filePath, content);

        return {
            key: key,
            version: "local-v1",
            size: typeof content === 'string' ? content.length : content.byteLength,
            etag: "local-etag",
            httpEtag: "local-etag",
            uploaded: new Date(),
            storageClass: "STANDARD",
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
        };
    }

    async delete(key: string): Promise<void> {
        const filePath = this.getPath(key);
        if (fs.existsSync(filePath)) {
            await fs.unlink(filePath);
        }
    }

    async list(options?: { prefix?: string; limit?: number }): Promise<{ objects: LocalObject[]; truncated: boolean; cursor?: string; delimitedPrefixes: string[] }> {
        const prefix = options?.prefix || '';
        const limit = options?.limit || 1000;

        const files: string[] = [];
        const traverse = async (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativeKey = path.relative(this.storagePath, fullPath);

                if (entry.isDirectory()) {
                    await traverse(fullPath);
                } else {
                    if (relativeKey.startsWith(prefix)) {
                        files.push(relativeKey);
                    }
                }
            }
        };

        await traverse(this.storagePath);

        const objects: LocalObject[] = files.slice(0, limit).map(key => ({
            key,
            version: "local",
            size: 0,
            etag: "local",
            httpEtag: "local",
            uploaded: new Date(),
            storageClass: "STANDARD",
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
        }));

        return {
            objects,
            truncated: files.length > limit,
            cursor: files.length > limit ? "cursor-mock" : undefined,
            delimitedPrefixes: []
        };
    }

    async head(key: string): Promise<LocalObject | null> {
        const filePath = this.getPath(key);
        if (!fs.existsSync(filePath)) return null;

        const stats = await fs.stat(filePath);
        return {
            key,
            version: "local-v1",
            size: stats.size,
            etag: "local-etag",
            httpEtag: "local-etag",
            uploaded: stats.mtime,
            storageClass: "STANDARD",
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
        };
    }
}
