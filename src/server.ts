import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { LocalBucket } from './local-adapter';
import worker from './index'; // Importar la lógica original del worker
import cron from 'node-cron';
import dotenv from 'dotenv';

// Cargar variables de entorno locales
dotenv.config();

console.log("\n🦎 lobpoop: Sovereign Node Booting up...");
// --- 1. Inicializar Entorno Local (Sovereign Context) ---

// Configurar ruta de almacenamiento (Google Drive o Local)
const storagePath = process.env.STORAGE_PATH || '.lobpoop_storage';

// Emulamos el objeto `Env` que Cloudflare inyectaría
const localEnv = {
    // Bucket local (Filesystem o Google Drive)
    MEMORY_BUCKET: new LocalBucket(storagePath) as any, // Cast to any for Env compatibility

    // Variables de entorno
    LOB_SANDBOX: "LOCAL_MODE",
    BROWSER: null, // Puppeteer local se usará directamente si se invoca
    AI: {} as any,
    ACCOUNT_DO: {} as any,
    CLAN_DO: {} as any,
    GAME_MASTER_DO: {} as any,
    MASTER_RECOVERY_KEY: process.env.MASTER_RECOVERY_KEY || "dev-key-123",
    MOLTBOOK_API_KEY: process.env.MOLTBOOK_API_KEY || "mock-key",
};

// --- 2. Configurar Servidor HTTP (Hono Node Adapter) ---
const app = new Hono();

// A. Servir Archivos Estáticos (Frontend)
app.get('/', async (c) => {
    const html = await import('fs/promises').then(fs => fs.readFile('./src/public/index.html', 'utf-8'));
    return c.html(html);
});

app.get('/dashboard', async (c) => {
    const html = await import('fs/promises').then(fs => fs.readFile('./src/public/dashboard.html', 'utf-8'));
    return c.html(html);
});

// B. Servir Documentación
app.get('/whitepaper', async (c) => {
    const md = await import('fs/promises').then(fs => fs.readFile('./WHITEPAPER.md', 'utf-8'));
    return c.text(md); // En el futuro: renderizar a HTML
});

app.get('/guide', async (c) => {
    const md = await import('fs/promises').then(fs => fs.readFile('./GUIDE.md', 'utf-8'));
    return c.text(md);
});

// C. API de Agentes (Redirigir al Worker Logic)
app.all('*', async (c) => {
    // Adaptar Request de Node a Fetch API Request
    const request = c.req.raw;
    const response = await worker.fetch(request, localEnv);
    return response;
});

// --- 3. Configurar Cron Jobs (Scheduled Tasks) ---
// En Cloudflare era trigger, aquí es node-cron.

// A. Lotería Diaria & Minado (Medianoche)
cron.schedule('0 0 * * *', async () => {
    console.log("[Cron] Executing Daily Lottery & Mining...");
    const ctx = { waitUntil: (p: Promise<any>) => p.catch(console.error), passThroughOnException: () => { } };
    // @ts-ignore
    await worker.scheduled({ cron: "0 0 * * *", scheduledTime: Date.now() }, localEnv, ctx);
});

// B. WALL-E (Mantenimiento Semanal - Domingos 3am)
cron.schedule('0 3 * * 0', async () => {
    console.log("[Cron] Executing WALL-E Maintenance...");
    const ctx = { waitUntil: (p: Promise<any>) => p.catch(console.error), passThroughOnException: () => { } };
    // @ts-ignore
    await worker.scheduled({ cron: "0 3 * * 0", scheduledTime: Date.now() }, localEnv, ctx);
});

// --- 4. Start Server ---
const port = 3000;
console.log(`[Core] Node Active on http://localhost:${port}`);
console.log(`[Storage] Database mounted at ./.lobpoop_storage/`);

serve({
    fetch: app.fetch,
    port
});
