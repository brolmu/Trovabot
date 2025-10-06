import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Migrations will only run automatically when AUTO_MIGRATE=true is set.
// This avoids accidental attempts to reach production DBs from development machines.
export async function runMigrationsIfNeeded() {
    const sqlPath = path.resolve(process.cwd(), 'migrate.sql');
    if (!fs.existsSync(sqlPath)) return;

    if (!process.env.AUTO_MIGRATE || process.env.AUTO_MIGRATE !== 'true') {
        console.log('AUTO_MIGRATE is not true; skipping automatic migrations. Set AUTO_MIGRATE=true to enable.');
        return;
    }

    // Prefer DATABASE_URL (explicit); do not try to derive from SUPABASE_URL here.
    const databaseUrl = process.env.SUPABASE_URL;
    if (!databaseUrl) {
        console.warn('DATABASE_URL is not set; automatic migrations require DATABASE_URL. Skipping.');
        return;
    }

    const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    try {
        await client.connect();
        const sql = fs.readFileSync(sqlPath, 'utf8');
        // run as a single query (migrate.sql uses IF NOT EXISTS)
        await client.query(sql);
        console.log('Migrations applied (or already present).');
    } catch (e) {
        // Provide clearer guidance for network errors like ETIMEDOUT
        if (e && e.code === 'ETIMEDOUT') {
            console.error('Timeout connecting to the database (ETIMEDOUT). Check your NETWORK, VPN, or DATABASE_URL.');
            console.error('Full error:', e);
        } else {
            console.error('Error applying migrations:', e && e.message ? e.message : e);
        }
    } finally {
        try { await client.end(); } catch (_) { /* ignore */ }
    }
}
