# Protocolo: Command Acknowledgement Pending

Este estado en la interfaz de **OpenClaw Forge** indica que el sistema ha enviado una señal al **Bridge** (Puente) pero está esperando una confirmación de recepción o ejecución satisfactoria.

## ¿Qué significa este estado?
Cuando ves "Command Acknowledgement Pending...", el flujo de datos se encuentra en el siguiente punto:

1. **Usuario -> Frontend:** Envías un comando (ej. `/spawn` o un mensaje).
2. **Frontend -> Worker:** El navegador envía el POST al Cloudflare Worker (`/agency/interact`).
3. **Worker -> Durable Object:** El Worker localiza la instancia del agente en el `AgencyDurableObject`.
4. **Durable Object -> Bridge:** Si es un comando que requiere ejecución local (como Puppeteer o scripts de sistema), el DO envía un mensaje vía WebSocket al **Bridge** (tu terminal local).
5. **EL BLOQUEO:** El mensaje está en el aire o el Bridge no ha respondido con un `ACK` (Acknowledgement).

## Posibles causas del bloqueo
1. **Bridge Offline:** El comando `npm start` en la carpeta `bridge` no está corriendo o perdió la conexión a internet.
2. **WebSocket Cerrado:** La sesión de WebSocket entre tu máquina local y el Worker de Cloudflare se ha cerrado por timeout (Cloudflare tiene un límite de 100 segundos).
3. **Error de Lógica en el Bridge:** El Bridge recibió el comando pero falló al procesarlo y no envió el mensaje de error de vuelta al DO.
4. **Identidad Desincronizada:** El `bridge_key` en tu `.env` local no coincide con el que espera el Worker.

## Guía de Resolución de Problemas

### 1. Verificar el estado del Bridge
Asegúrate de que en tu terminal local veas logs de conexión activa:
```bash
[SYSTEM] Bridge connected to openclaw-agency-v4
[READY] Waiting for commands...
```

### 2. Reiniciar el Flujo
Si el mensaje persiste por más de 15 segundos:
- **Refresca la página** del terminal (Frontend).
- **Reinicia el Bridge** terminando el proceso y ejecutando `npm start` de nuevo.
- **Verifica el Log del Worker:** Usa `wrangler tail openclaw-agency-v4` para ver si el mensaje está llegando al Worker.

### 3. Verificación de LLM
A veces el "Cerebro" (o Engine) tarda en procesar la respuesta de la IA (Gemini/Claude). Si la IA está lenta, el Worker podría tardar en responder, dejando al Frontend en espera.

## Arquitectura de Confirmación (ACK)
El sistema utiliza un handshake de tres vías:
- **CMD:** Envió del comando.
- **ACK:** Recibido por el Bridge (El Frontend cambia a "Executing...").
- **RES:** Resultado final con datos (El Frontend muestra la respuesta).

Si te quedas en **Pending**, el eslabón roto es el **ACK**.
