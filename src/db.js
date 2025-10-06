import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

let supabase = null;
let authorizedUsers = [];
let botState = { enabled: true };

export function getSupabase() {
    return supabase;
}

export function getAuthorizedUsers() {
    return authorizedUsers;
}

export function getBotState() {
    return botState;
}

export async function initSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('SUPABASE_URL or SUPABASE_SERVICE_KEY not set — Supabase integration is required. Exiting.');
        process.exit(1);
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const requiredTables = ['authorized_users', 'messages', 'bot_state'];

    const tables = await supabase.from('authorized_users').select('*');
    console.log('Supabase tables:', tables);
    for (const t of requiredTables) {
        try {
            const { error } = await supabase.from(t).select('*').limit(1);
            if (error) throw error;
        } catch (e) {
            console.error(`Supabase table "${t}" is missing or inaccessible:`, e.message || e);
            console.error('Please run migrate.sql to create the required tables. Exiting.');
            process.exit(1);
        }
    }

    try {
        const { data: users, error: uErr } = await supabase.from('authorized_users').select('username');
        if (uErr) throw uErr;
        if (Array.isArray(users)) {
            authorizedUsers = users.map(r => (r.username || '').toLowerCase()).filter(Boolean);
        }
    } catch (e) {
        console.error('Error loading authorized_users from Supabase:', e.message || e);
        process.exit(1);
    }

    try {
        const { data: stateRows, error: sErr } = await supabase.from('bot_state').select('value').eq('key', 'global').limit(1);
        if (sErr) throw sErr;
        if (stateRows && stateRows.length > 0) {
            const value = stateRows[0].value || {};
            botState = { enabled: !!value.enabled };
        } else {
            await supabase.from('bot_state').upsert([{ key: 'global', value: botState }]);
        }
    } catch (e) {
        console.error('Error loading bot_state from Supabase:', e.message || e);
        process.exit(1);
    }
}

export async function insertMessage(channel, username, message, type = 'chat') {
    if (!supabase) return;
    try {
        await supabase.from('messages').insert([{ channel: channel.toLowerCase(), username: username.toLowerCase(), message, type }]);
    } catch (e) {
        console.error('Error inserting message into Supabase:', e.message || e);
    }
}

export async function addAuthorizedUserDB(username) {
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('authorized_users').insert([{ username }]);
        if (error) {
            if (error.code === '23505' || /unique/i.test(error.message || '')) return false;
            console.error('Supabase insert error:', error.message || error);
            return false;
        }
        if (!authorizedUsers.includes(username)) authorizedUsers.push(username);
        return true;
    } catch (e) {
        console.error('Error adding authorized user to Supabase:', e.message || e);
        return false;
    }
}

export async function removeAuthorizedUserDB(username) {
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('authorized_users').delete().eq('username', username);
        if (error) {
            console.error('Error removing authorized user from Supabase:', error.message || error);
            return false;
        }
        authorizedUsers = authorizedUsers.filter(u => u !== username);
        return true;
    } catch (e) {
        console.error('Error removing authorized user from Supabase:', e.message || e);
        return false;
    }
}

export async function deleteMessagesForChannel(channel) {
    if (!supabase) return;
    try {
        await supabase.from('messages').delete().eq('channel', channel.toLowerCase());
    } catch (e) {
        console.error('Error deleting messages for channel from Supabase:', e.message || e);
    }
}

export async function upsertBotState(newState) {
    if (!supabase) return;
    try {
        botState = newState;
        await supabase.from('bot_state').upsert([{ key: 'global', value: botState }]);
    } catch (e) {
        console.error('Error saving bot_state to Supabase:', e.message || e);
    }
}
