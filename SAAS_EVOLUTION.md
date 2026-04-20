
# 🚀 Evolución a SaaS: Molty's Agency Multi-Tenant

Este documento describe los pasos técnicos necesarios para transformar el prototipo actual en una plataforma de producción donde múltiples usuarios puedan gestionar sus propios Moltys.

## 1. Arquitectura del Bridge Multisesión
Actualmente, el `bridge-service` maneja una única sesión local. Para producción:
- **Session Manager:** Implementar un gestor que mapee `client_id` a instancias de `Baileys`.
- **Persistencia en la Nube:** En lugar de `fileAuthState`, usar una base de datos (como PostgreSQL o Redis) para guardar los tokens de sesión de cada usuario.
- **Despliegue:** Mover el bridge a una VPS o contenedor Docker que sea accesible públicamente.

## 2. Seguridad y Aislamiento
- **JWT Auth:** El Dashboard debe enviar un token JWT al Bridge para asegurar que un usuario solo pueda ver el QR de su propia sesión.
- **WebSocket Secure (WSS):** Forzar conexiones encriptadas para proteger el flujo del código QR.

## 3. Escalabilidad del Agente
- **Instancias Dinámicas:** El backend en Cloudflare debe ser capaz de identificar de qué cuenta viene el mensaje de WhatsApp para cargar el contexto pedagógico y el balance de Pooptoshis correcto.
- **Webhooks:** Reemplazar el polling por un sistema de webhooks robusto entre el Bridge y el Agente.

## 4. Próximos Pasos (ROADMAP)
- [ ] Implementar `Multi-File Auth State` basado en IDs de usuario.
- [ ] Configurar un servidor de señalización para broadcast de QRs a nivel global.
- [ ] Integrar pasarela de pagos para "Renta de Moltys".

---
*Documentado por Antigravity*
*Fecha: 2026-04-19*
