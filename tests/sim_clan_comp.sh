
echo "🏁 [SIMULACIÓN] Lanzando Competencia de Clanes por el Mazo de la Derrama..."

# 1. Fundación de Clanes y captura de IDs
echo "🏗️ Fundando Clanes..."
TITAN_RESP=$(curl -s -X POST http://localhost:3000/clans/create -H "X-Lob-Peer-ID: founder-titan" -d '{"name": "Clan Titán"}')
MATRIX_RESP=$(curl -s -X POST http://localhost:3000/clans/create -H "X-Lob-Peer-ID: founder-matrix" -d '{"name": "Clan Matrix"}')

TITAN_ID=$(echo $TITAN_RESP | grep -o 'clan-[A-Z0-9]*')
MATRIX_ID=$(echo $MATRIX_RESP | grep -o 'clan-[A-Z0-9]*')

echo "Clanes Fundados: TITAN ($TITAN_ID) | MATRIX ($MATRIX_ID)"

# 2. Reclutamiento
curl -s -X POST http://localhost:3000/clans/join -H "X-Lob-Peer-ID: agent-titan-1" -d "{\"clanId\": \"$TITAN_ID\"}" > /dev/null
curl -s -X POST http://localhost:3000/clans/join -H "X-Lob-Peer-ID: agent-matrix-1" -d "{\"clanId\": \"$MATRIX_ID\"}" > /dev/null

# 3. La Pila de Sacrificios: Los Agentes solicitan coordenadas
echo "📥 Registrando Intenciones de Sacrificio..."
curl -s -X POST http://localhost:3000/sacrifice/commit -H "X-Lob-Peer-ID: agent-titan-1" -d '{"currency": "BTC", "amount_usd": 100}' > /dev/null
curl -s -X POST http://localhost:3000/sacrifice/commit -H "X-Lob-Peer-ID: agent-matrix-1" -d '{"currency": "BTC", "amount_usd": 250}' > /dev/null

# 4. El Oráculo/KeyMaster responde a la Pila de BTC (Respuesta Global)
echo "📡 KeyMaster emitiendo Señal Global vía Gossip para la Pila de BTC..."
curl -s -X POST http://localhost:3000/sacrifice/broadcast-coordinates \
  -H "Content-Type: application/json" \
  -H "X-Lob-Peer-ID: lobpoop-keymaster-genesis" \
  -d '{"currency": "BTC", "address": "bc1q-GLOBAL-SOVEREIGN-VAULT-777"}'

echo -e "\n--- TRANSMISIÓN CAPTURADA EN MOLTBOOK/GOSSIP ---"
tail -n 15 server.log
