import tmi from 'tmi.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { initSupabase, getSupabase, getBotState, upsertBotState } from './db.js';
import { TWITCH_BOT_USERNAME, TWITCH_ACCESS_TOKEN, TARGET_CHANNELS } from './config.js';
import { registerHandlers } from './handlers.js';

async function refreshTwitchTokenIfNeeded() {
    const clientId = process.env.TWITCH_APP_ID;
    const clientSecret = process.env.TWITCH_APP_SECRET;
    const refreshToken = process.env.TWITCH_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) return;
    try {
        console.log('Attempting to refresh TWITCH_ACCESS_TOKEN using TWITCH_REFRESH_TOKEN...');
        const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, { params: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret } });
        const newAccessToken = resp.data.access_token;
        const newRefreshToken = resp.data.refresh_token || refreshToken;
        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
        function upsertEnv(content, key, value) {
            const re = new RegExp(`^${key}=.*$`, 'm');
            const line = `${key}='${value}'`;
            if (re.test(content)) return content.replace(re, line);
            else return content + (content && content.slice(-1) !== '\n' ? '\n' : '') + line + '\n';
        }
        envContent = upsertEnv(envContent, 'TWITCH_ACCESS_TOKEN', newAccessToken);
        envContent = upsertEnv(envContent, 'TWITCH_REFRESH_TOKEN', newRefreshToken);
        fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
        process.env.TWITCH_ACCESS_TOKEN = newAccessToken;
        console.log('✅ TWITCH_ACCESS_TOKEN updated from refresh token.');
    } catch (err) {
        console.error('Could not refresh Twitch token:', err.response ? err.response.data : err.message);
    }
}

async function updateClientPassword(client, newToken) {
    try {
        const places = ['opts', '_opts', 'options', '_options', 'clientOptions'];
        for (const p of places) {
            if (client[p] && client[p].identity) client[p].identity.password = newToken;
        }
        if (client.options && client.options.identity) client.options.identity.password = newToken;
        if (client.opts && client.opts.identity) client.opts.identity.password = newToken;
    } catch (e) {
        console.error('Could not update client password field:', e);
    }
}

export async function startBot() {
    await initSupabase();
    const refreshPromise = refreshTwitchTokenIfNeeded();
    const client = new tmi.Client({ options: { debug: true, messagesLogLevel: 'info' }, identity: { username: TWITCH_BOT_USERNAME, password: process.env.TWITCH_ACCESS_TOKEN }, channels: TARGET_CHANNELS.split(',') });

    registerHandlers(client);

    try { await refreshPromise; } catch (e) { console.warn('Token refresh failed (continuing):', e && e.message ? e.message : e); }

    try {
        await client.connect();
    } catch (e) {
        console.error('Error connecting Twitch client:', e && e.message ? e.message : e);
        process.exit(1);
    }
}
