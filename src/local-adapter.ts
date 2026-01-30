import fs from 'fs-extra';
import path from 'path';

// --- Local Storage Adapter (R2 Emulation) ---
// Emula la API de Cloudflare R2 usando el sistema de archivos local.
// Esto permite que el código sea agnóstico a la infraestructura (Cloud vs Local).

export class LocalBucket implements R2Bucket {
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

    async get(key: string): Promise<R2ObjectBody | null> {
        const filePath = this.getPath(key);
        if (!fs.existsSync(filePath)) return null;

        const content = await fs.readFile(filePath);

        // Mocking R2ObjectBody interface loosely
        return {
            body: content,
            bodyUsed: false,
            arrayBuffer: async () => content.buffer,
            text: async () => content.toString('utf-8'),
            json: async () => JSON.parse(content.toString('utf-8')),
            blob: async () => new Blob([content]),
            // Metadata mock
            key: key,
            version: "local-v1",
            size: content.length,
            etag: "local-etag",
            httpEtag: "local-etag",
            uploaded: new Date(),
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
            writeHttpMetadata: () => { }
        } as unknown as R2ObjectBody;
    }

    async put(key: string, value: any, options?: any): Promise<R2Object | null> {
        const filePath = this.getPath(key);
        await fs.ensureDir(path.dirname(filePath));

        // Handle differnet value types
        let content: string | Buffer;
        if (typeof value === 'string') {
            content = value;
        } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
            content = value;
        } else {
            // Assume stream or other object, stringify if object
            content = JSON.stringify(value);
        }

        await fs.writeFile(filePath, content);

        return {
            key: key,
            version: "local-v1",
            size: content.length,
            etag: "local-etag",
            httpEtag: "local-etag",
            uploaded: new Date(),
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
            writeHttpMetadata: () => { }
        } as unknown as R2Object;
    }

    async delete(key: string): Promise<void> {
        const filePath = this.getPath(key);
        if (fs.existsSync(filePath)) {
            await fs.unlink(filePath);
        }
    }

    // Listado simulado (no muy eficiente pero funcional para local)
    async list(options?: R2ListOptions): Promise<R2Objects> {
        const prefix = options?.prefix || '';
        const limit = options?.limit || 1000;

        const files: string[] = [];
        const traverse = async (dir: string) => {
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

        // Mock R2Objects
        const objects = files.slice(0, limit).map(key => ({
            key,
            version: "local",
            size: 0,
            etag: "local",
            httpEtag: "local",
            uploaded: new Date(),
            httpMetadata: {},
            customMetadata: {},
            checksums: {},
            writeHttpMetadata: () => { }
        } as R2Object));

        return {
            objects,
            truncated: files.length > limit,
            cursor: files.length > limit ? "cursor-mock" : undefined,
            delimitedPrefixes: []
        };
    }

    // Stubs para cumplir interfaz TS
    async head(key: string): Promise<R2Object | null> { return null; }
    createMultipartUpload(key: string): Promise<R2MultipartUpload> { throw new Error("Multipart not supported locally"); }
    resumeMultipartUpload(key: string, uploadId: string): Promise<R2MultipartUpload> { throw new Error("Multipart not supported locally"); }
}
