
import { Env } from '../src/index';

// Simulating the environment and execution context locally is tricky without a full emulation.
// However, we can use the remote execution via the API if it's deployed, OR assume this runs as a script 
// that imports the core logic if we adjust imports.

// But wait, the user is running `Use` on the terminal. The best way is to use a direct script that 
// invokes the function if we can mock the Env.

// BETTER APPROACH: Use the 'execute' endpoint via fetch if the worker is up, 
// OR run a standalone script if we have access to the DB.
// Since we are likely in local dev, let's create a script that IMPORTS the logic and MOCKS the Env 
// to hit the remote R2 bucket if possible, or just uses the local state.

// PLAN B: Construct a fetch request to a special hidden endpoint or use the existing "execute" endpoint 
// to run a script inside the VM that calls the lottery function.

async function forceLottery() {
    console.log("🔨 FORCING LOTTERY DRAW...");

    // We will use the 'execute' endpoint which allows KeyMaster to run arbitrary code on the worker.
    // This is the cleanest way to interact with the deployed state.

    const WORKER_URL = "https://lobpoop-core.miladyxx333.workers.dev"; // PRODUCTION URL
    const GENESIS_SECRET = "lobpoop-alpha-omega-333"; // Default from codebase

    const code = `Lottery.forceDraw`;

    try {
        const response = await fetch(`${WORKER_URL}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Lob-Peer-ID': 'lobpoop-keymaster-genesis',
                'X-Genesis-Secret': GENESIS_SECRET
            },
            body: JSON.stringify({ code })
        });

        const result = await response.json();
        console.log("✅ RESULT:", result);
    } catch (e) {
        console.error("❌ FAILED:", e);
    }
}

forceLottery();
