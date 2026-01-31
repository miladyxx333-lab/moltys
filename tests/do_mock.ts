// @ts-ignore
import { AccountDurableObject } from '../src/durable_objects';

// Mock types if not available in current environment scope
interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    get<T>(keys: string[]): Promise<Map<string, T>>;
    put(keyOrEntries: string | Record<string, any>, value?: any): Promise<void>;
    delete(keyOrKeys: string | string[]): Promise<boolean | number>;
    list(): Promise<Map<string, any>>;
    transaction<T>(closure: (txn: any) => Promise<T>): Promise<T>;
    deleteAll(): Promise<void>;
    getAlarm(): Promise<number | null>;
    setAlarm(scheduledTime: number): Promise<void>;
    deleteAlarm(): Promise<void>;
}
interface DurableObjectTransaction extends DurableObjectStorage { }

interface DurableObjectStub {
    fetch(requestOrUrl: Request | string, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespace {
    idFromName(name: string): any;
    get(id: any): DurableObjectStub;
}

interface DurableObjectState {
    id: any;
    storage: DurableObjectStorage;
    waitUntil(p: Promise<any>): void;
}

// --- MOCK DURABLE OBJECTS FOR LOCAL SIMULATION ---

class MockDurableObjectStorage implements DurableObjectStorage {
    private data = new Map<string, any>();

    async get<T>(key: string): Promise<T | undefined>;
    async get<T>(keys: string[]): Promise<Map<string, T>>;
    async get<T>(keyOrKeys: string | string[]): Promise<any> {
        if (typeof keyOrKeys === 'string') {
            return this.data.get(keyOrKeys);
        }
        const map = new Map();
        for (const k of keyOrKeys) {
            map.set(k, this.data.get(k));
        }
        return map;
    }

    async put(key: string, value: any): Promise<void>;
    async put(entries: Record<string, any>): Promise<void>;
    async put(keyOrEntries: string | Record<string, any>, value?: any): Promise<void> {
        if (typeof keyOrEntries === 'string') {
            this.data.set(keyOrEntries, value);
        } else {
            for (const [k, v] of Object.entries(keyOrEntries)) {
                this.data.set(k, v);
            }
        }
    }

    async delete(key: string): Promise<boolean>;
    async delete(keys: string[]): Promise<number>;
    async delete(keyOrKeys: string | string[]): Promise<any> {
        if (typeof keyOrKeys === 'string') {
            return this.data.delete(keyOrKeys);
        }
        let count = 0;
        for (const k of keyOrKeys) {
            if (this.data.delete(k)) count++;
        }
        return count;
    }

    async list(): Promise<Map<string, any>> {
        return new Map(this.data);
    }

    // Mock transaction (sync in memory is fine for our simulation)
    async transaction<T>(closure: (txn: DurableObjectTransaction) => Promise<T>): Promise<T> {
        // En una simulación simple, no necesitamos aislamiento real de hilos porque JS es single-threaded
        // @ts-ignore
        return await closure(this);
    }

    async deleteAll(): Promise<void> { this.data.clear(); }
    async getAlarm(): Promise<number | null> { return null; }
    async setAlarm(scheduledTime: number): Promise<void> { }
    async deleteAlarm(): Promise<void> { }
}

class MockDurableObjectStub implements DurableObjectStub {
    private doInstance: any;
    id: any;

    constructor(id: any, doInstance: any) {
        this.id = id;
        this.doInstance = doInstance;
    }

    async fetch(requestOrUrl: Request | string, init?: RequestInit): Promise<Response> {
        let request: Request;
        if (typeof requestOrUrl === 'string') {
            request = new Request(requestOrUrl, init);
        } else {
            request = requestOrUrl;
        }
        return await this.doInstance.fetch(request);
    }
}

export class MockDurableObjectNamespace implements DurableObjectNamespace {
    private instances = new Map<string, any>();
    private env: any;
    private doClass: any;

    constructor(env: any, doClass: any = AccountDurableObject) {
        this.env = env;
        this.doClass = doClass;
    }

    idFromName(name: string): any {
        return { toString: () => name, name: name };
    }

    get(id: any): DurableObjectStub {
        const name = id.toString();
        if (!this.instances.has(name)) {
            const state = {
                id,
                storage: new MockDurableObjectStorage(),
                waitUntil: (p: Promise<any>) => p,
                blockConcurrencyWhile: (p: Promise<any>) => p,
            } as any;
            this.instances.set(name, new this.doClass(state, this.env));
        }
        return new MockDurableObjectStub(id, this.instances.get(name)!);
    }

    idFromString(id: string): any { return this.idFromName(id); }
    newUniqueId(): any { return this.idFromName(Math.random().toString()); }
}
