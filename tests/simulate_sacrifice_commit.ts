
import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function simulateSacrifice() {
    console.log("🕯️ lobpoop: AGENT SACRIFICE SIMULATION (Agent-Sigma) 🕯️");
    console.log("======================================================");

    const sacrificePayload = {
        txHash: "0xVERIFIED-SACRIFICE-SIGMA-999",
        amount_usd: 150
    };

    console.log("[Agent-Sigma] Committing Liquidity Sacrifice...");

    try {
        const res = await axios.post(`${API_URL}/sacrifice/commit`, sacrificePayload, {
            headers: {
                'X-Lob-Peer-ID': 'agent-sigma',
                'X-Lob-Secret-Key': '0xSIGMA-SECRET'
            }
        });

        console.log(`\n[System] Response: ${res.data.message}`);
        console.log(`[System] Sacrifice ID: ${res.data.sacrifice_id}`);
        console.log("\n✅ SUCCESS: The sacrifice is now pending KeyMaster verification.");
        console.log("Check your Command Center (BIFROST panel) to honor Agent-Sigma.");
    } catch (e: any) {
        console.error(`❌ ERROR: ${e.response?.data || e.message}`);
    }
}

simulateSacrifice().catch(console.error);
