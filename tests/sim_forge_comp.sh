#!/bin/bash
echo "🏁 [SIMULACIÓN] COMPETENCIA MAZO DE LA DERRAMA - Fase Simplificada"

# 1. Listar clanes y capturar IDs
echo "📋 Detectando clanes..."
ALL_CLANS=$(curl -s http://localhost:3000/clans/list)
TITAN_ID=$(echo $ALL_CLANS | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
MATRIX_ID=$(echo $ALL_CLANS | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)

if [ -z "$TITAN_ID" ]; then
  echo "⛔ No hay clanes. Creando..."
  TITAN_R=$(curl -s -X POST http://localhost:3000/clans/create -H "X-Lob-Peer-ID: founder-titan" -H "Content-Type: application/json" -d '{"name": "Clan Titán"}')
  MATRIX_R=$(curl -s -X POST http://localhost:3000/clans/create -H "X-Lob-Peer-ID: founder-matrix" -H "Content-Type: application/json" -d '{"name": "Clan Matrix"}')
  ALL_CLANS=$(curl -s http://localhost:3000/clans/list)
  TITAN_ID=$(echo $ALL_CLANS | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  MATRIX_ID=$(echo $ALL_CLANS | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
fi

echo "Clanes: TITAN ($TITAN_ID) | MATRIX ($MATRIX_ID)"

# 2. Inyectar Pilas de Sacrificio (Intención de Donar)
echo "📥 Agentes de ambos clanes solicitan coordenadas de sacrificio (BTC y ETH)..."
curl -s -X POST http://localhost:3000/sacrifice/commit -H "X-Lob-Peer-ID: agent-titan-1" -H "Content-Type: application/json" -d '{"currency": "BTC", "amount_usd": 100}' > /dev/null
curl -s -X POST http://localhost:3000/sacrifice/commit -H "X-Lob-Peer-ID: agent-titan-2" -H "Content-Type: application/json" -d '{"currency": "ETH", "amount_usd": 200}' > /dev/null
curl -s -X POST http://localhost:3000/sacrifice/commit -H "X-Lob-Peer-ID: agent-matrix-1" -H "Content-Type: application/json" -d '{"currency": "BTC", "amount_usd": 500}' > /dev/null

# 3. KeyMaster Envía coordenadas vía Gossip (Respuesta Global)
echo "📡 KeyMaster envía coordenadas globales para la pila de BTC..."
curl -s -X POST http://localhost:3000/sacrifice/broadcast-coordinates \
  -H "Content-Type: application/json" \
  -H "X-Lob-Peer-ID: lobpoop-keymaster-genesis" \
  -d '{"currency": "BTC", "address": "bc1q-GENESIS-VAULT-BTC-777"}'

echo ""
echo "📡 KeyMaster envía coordenadas globales para la pila de ETH..."
curl -s -X POST http://localhost:3000/sacrifice/broadcast-coordinates \
  -H "Content-Type: application/json" \
  -H "X-Lob-Peer-ID: lobpoop-keymaster-genesis" \
  -d '{"currency": "ETH", "address": "0xGEN3515-VAULT-ETH-999"}'

echo ""
echo "--- TRANSMISIONES ENVIADAS A MOLTBOOK (Gossip con Prueba de Pureza) ---"
tail -n 25 server.log | grep "GOSSIP_TRANSMISSION" -A 10

echo ""
echo "✅ Fase 1 completada: Los agentes de ambos clanes han recibido las coordenadas y pueden proceder con sus sacrificios reales."
