
const MAX_SUPPLY = 1_000_000_000;
const BASE_DAILY = 1333; // Lottery + Faucet inicial
const HALVING_OPS = 210_000;
const TASK_REWARD = 1;

interface Scenario {
    name: string;
    description: string;
    dailyGrowthRate: number; // 0.01 = 1% diario
    avgTasksPerUser: number;
    initialUsers: number;
    clanDensity: number; // % de usuarios en clanes productivos
    clanProdPerMember: number; // Psh/día extra por ser miembro de clan top
}

function simulateRunway(scenario: Scenario) {
    let supply = 0;
    let days = 0;
    let users = scenario.initialUsers;
    let opsCounter = 0;

    console.log(`\n📋 Escenario: ${scenario.name}`);
    console.log(`   "${scenario.description}"`);
    console.log(`   > Crecimiento Diario: ${(scenario.dailyGrowthRate * 100).toFixed(2)}%`);

    while (supply < MAX_SUPPLY) {
        days++;

        // 1. Crecimiento de Usuarios (Logístico/Exponencial con cap realista de población mundial lol)
        // Simplificado: Exponencial suave
        users = users * (1 + scenario.dailyGrowthRate);
        if (users > 100_000_000) users = 100_000_000; // Cap de saturación soft

        // 2. Operaciones (Halving trigger)
        const dailyOps = users * scenario.avgTasksPerUser;
        opsCounter += dailyOps;

        // 3. Halving Math
        const halvings = Math.floor(opsCounter / HALVING_OPS);
        const reduction = Math.pow(2, halvings);

        // 4. Emisión
        // A. Base (Lotería + Faucet) - Se reduce con Halving
        const baseEmission = BASE_DAILY / reduction;

        // B. Proof of Work (Tasks) - FIJO 1 Psh (Inflacionario)
        const taskEmission = dailyOps * TASK_REWARD;

        // C. Clanes & Magia (Boosts)
        const clanMembers = users * scenario.clanDensity;
        const clanEmission = clanMembers * scenario.clanProdPerMember;

        const dailyTotal = baseEmission + taskEmission + clanEmission;
        supply += dailyTotal;

        // Safety break
        if (days > 365 * 100) {
            console.log(`   ⚠️ LÍMITE DE SIMULACIÓN: >100 Años. Supply: ${(supply / 1000000).toFixed(1)}M`);
            return;
        }
    }

    const years = (days / 365).toFixed(2);
    console.log(`   🏁 META DE 1B ALCANZADA EN: ${days.toLocaleString()} días (~${years} años)`);
    console.log(`   📊 Stats Finales:`);
    console.log(`      - Usuarios Activos: ${Math.floor(users).toLocaleString()}`);
    console.log(`      - Halvings de Base: ${Math.floor(opsCounter / HALVING_OPS)}`);
}

// 1. Escenario Pesimista / Nicho
simulateRunway({
    name: "🐢 CULTS & FRIENDS",
    description: "Solo tú y tus amigos. Crecimiento muy lento.",
    dailyGrowthRate: 0.0005, // 0.05% diario
    avgTasksPerUser: 2,
    initialUsers: 50,
    clanDensity: 0.2,
    clanProdPerMember: 0.5
});

// 2. Escenario Saludable
simulateRunway({
    name: "🐝 ENJAMBRE ORGÁNICO",
    description: "Product Market Fit. Crecimiento constante.",
    dailyGrowthRate: 0.01, // 1% diario
    avgTasksPerUser: 5,
    initialUsers: 100,
    clanDensity: 0.5,
    clanProdPerMember: 5
});

// 3. Escenario Viral
simulateRunway({
    name: "🚀 EUPHORIA PROTOCOL",
    description: "Adopción Masiva. Tokenomics bajo estrés máximo.",
    dailyGrowthRate: 0.02, // 2% diario
    avgTasksPerUser: 10,
    initialUsers: 500,
    clanDensity: 0.8,
    clanProdPerMember: 20 // Muchos bonos activos
});
