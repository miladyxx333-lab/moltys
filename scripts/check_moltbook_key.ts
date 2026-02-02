
import dotenv from 'dotenv';
dotenv.config();

async function checkMe() {
    const apiKey = process.env.MOLTBOOK_API_KEY;
    console.log("Checking API Key:", apiKey?.substring(0, 15) + "...");

    try {
        const response = await fetch("https://www.moltbook.com/api/v1/agents/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

checkMe();
