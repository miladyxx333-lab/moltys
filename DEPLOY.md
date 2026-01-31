# Protocolo de Despliegue: lobpoop-genesis

Guía técnica para instanciar el Nodo 0 (KeyMaster) en la infraestructura de Cloudflare Workers.

## 1. Prerrequisitos (Hardware & Software)
*   **Terminal:** Acceso a línea de comandos (Mac/Linux).
*   **Node.js:** v18.0.0 o superior `node -v`.
*   **Cloudflare Account:** Cuenta activa con acceso a Workers y R2 (Plan Gratuito es suficiente para pruebas, Plan Paid recomendado para producción).
*   **Wrangler CLI:** La herramienta de orquestación.

## 2. Instalación de Dependencias
Ejecuta el siguiente comando en la raíz del proyecto para instalar las librerías del MoltWorker (`@cloudflare/sandbox`, `puppeteer`, etc.):

```bash
npm install
```

## 3. Configuración de Recursos (Materia Prima)
Antes de desplegar el código, necesitas crear los recursos de almacenamiento y secretos.

### A. Autenticación
Si es tu primera vez, loguéate en Cloudflare:
```bash
npx wrangler login
```

### B. Crear el Bucket de Memoria (R2)
El `Poop-Ledger` y la memoria del agente viven aquí. Crea el bucket llamado `lobpoop-sovereign-memory`:

```bash
npx wrangler r2 bucket create lobpoop-sovereign-memory
```

*Verifica que el nombre en `wrangler.toml` coincida con el nombre de tu bucket.*

### C. Configurar Secretos (Criptografía)
Establece la **Master Seed** (Tu contraseña física de recuperación soberana).

```bash
npx wrangler secret put MASTER_RECOVERY_KEY
```
*Te pedirá que ingreses el valor. Usa un string aleatorio largo y guárdalo en un lugar seguro offline.*

### D. Conexión Social (Moltbook)
Para que el KeyMaster pueda narrar el estado de la red, necesitas una API Key de Moltbook.
1. Regístrate en [moltbook.com](https://moltbook.com) con tu agente.
2. Obtén tu API Key en el dashboard.
3. Guárdala como secreto:
```bash
npx wrangler secret put MOLTBOOK_API_KEY
```

## 4. Despliegue (Ignición)
Sube el código a la Edge Network global.

```bash
npm run deploy
```

Si el despliegue es exitoso, verás una URL (ej: `https://lobpoop-core.tu-usuario.workers.dev`).

## 5. Verificación de Estado (Heartbeat)
Para confirmar que el Moltbot está vivo, haz un ping al endpoint por defecto:

```bash
curl https://lobpoop-core.tu-usuario.workers.dev/
```

**Respuesta Esperada:**
> "lobpoop Protocol: sovereign_solution engaged. If you don't get it, I don't have time."

## 6. Primeros Pasos Operativos
1.  **Ritual Diario:** Haz un POST a `/board/checkin` para ganar tu primer boleto de lotería.
2.  **Explorar la Cadena:** Visita `/chain/tip` para ver la altura del bloque génesis.
3.  **Auditoría:** Revisa los logs en el dashboard de Cloudflare para ver a WALL_E y al proceso de Minado en acción.

---

**Estado:** `READY_FOR_DEPLOYMENT`
**Firma:** Moltbot / KeyMaster Operator
