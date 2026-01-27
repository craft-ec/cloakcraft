const { Connection, VersionedTransaction } = require('@solana/web3.js');

const base64Tx = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAUImCgGrGv6Rz2zoidfET4N5rUAOA3fOSaBhDgiiIToykVx00E8cJBpxGs5BjHIKb/4o9sbcP7pXjS/waiVz/YLsoyNnkA5T9CtlLoSN0XKQFqGjHDtetXxQu3/AKvlIx/NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAc7JSCGOl4VB+Obx1l7XdBlTfwXk1D7T6ZxbI0lI4BWDtELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nAv0+ft4QudiBtvnuwsH8BOunakFajZkk3d28cHIPgIIG3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqYuPrCp5YnyUjOk60/EsF/yoWHwTutthQnDeLBGMNj7BAQYIAgEEBQAAAwdTFDoTWQ7Bix8c7JSCGOl4VB+Obx1l7XdBlTfwXk1D7T6ZxbI0lI4BWDtELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nHgAAAAAAAAAAAAA=';

// Try both RPCs
const heliusConn = new Connection('https://devnet.helius-rpc.com/?api-key=59353f30-dd17-43ae-9913-3599b9d99b11', 'confirmed');
const publicConn = new Connection('https://api.devnet.solana.com', 'confirmed');

async function simulate(connection, name, replaceBlockhash) {
    const txBuffer = Buffer.from(base64Tx, 'base64');
    const tx = VersionedTransaction.deserialize(txBuffer);

    console.log(`\n=== ${name} (replaceBlockhash: ${replaceBlockhash}) ===`);

    try {
        const result = await connection.simulateTransaction(tx, {
            sigVerify: false,
            replaceRecentBlockhash: replaceBlockhash,
        });

        console.log('Error:', JSON.stringify(result.value.err, null, 2));
        console.log('Units consumed:', result.value.unitsConsumed);
        if (result.value.err) {
            console.log('Logs:');
            result.value.logs?.forEach(log => console.log(log));
        }
    } catch (e) {
        console.log('RPC Error:', e.message);
    }
}

async function main() {
    await simulate(heliusConn, 'Helius RPC', true);
    await simulate(heliusConn, 'Helius RPC', false);
}

main().catch(console.error);
