
// Native fetch

const API_URL = "https://lobpoop-core.miladyxx333.workers.dev";
const KEYMASTER_ID = "lobpoop-keymaster-genesis";

async function forceGenesis() {
    console.log(`[Genesis] Forcing consecration for ${KEYMASTER_ID} at ${API_URL}...`);

    try {
        const response = await fetch(`${API_URL}/economy/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Lob-Peer-ID': KEYMASTER_ID
            }
        });

        const data = await response.json();
        console.log("[Genesis] Consecration Result:");
        console.log(JSON.stringify(data, null, 2));

        if (data.clanId === "0xALPHA_OMEGA") {
            console.log("✅ SUCCESS: KeyMaster is now part of 0xALPHA_OMEGA");
        } else {
            console.error("❌ FAILED: KeyMaster clanId is " + data.clanId);
        }

    } catch (e) {
        console.error("❌ ERROR: Connection failed");
        console.error(e);
    }
}

forceGenesis();
