import { normalizeUsername, buildContextText, generarTrova } from './utils.js';
import { getAuthorizedUsers, getBotState, insertMessage, addAuthorizedUserDB, removeAuthorizedUserDB, deleteMessagesForChannel, upsertBotState } from './db.js';
import { getSupabase } from './db.js';

let messageContext = {};
const savedCommandsByChannel = new Map();

export function getMessageContext() {
    return messageContext;
}

export function pushMessageToContext(channel, user, message, type = 'chat') {
    const key = channel.replace(/^#/, '');
    const prefix = '!';
    const msg = (message || '').toString();
    const isCommand = msg.trim().startsWith(prefix);

    if (isCommand) {
        const command = msg.trim().split(/\s+/)[0]; // e.g. "!event"
        const seen = savedCommandsByChannel.get(key) || new Set();
        if (seen.has(command)) {
            return;
        }
        seen.add(command);
        savedCommandsByChannel.set(key, seen);
        if (!messageContext[key]) messageContext[key] = [];
        const entry = { user, message: msg, type: command, ts: new Date().toISOString() };
        messageContext[key].push(entry);
        const supabase = getSupabase();
        if (supabase) {
            insertMessage(key, (user||'').toLowerCase(), msg, command).catch(() => {});
        }
        return;
    }

    if (!messageContext[key]) messageContext[key] = [];
    const entry = { user, message: msg, type, ts: new Date().toISOString() };
    messageContext[key].push(entry);
    const supabase = getSupabase();
    if (supabase) {
        insertMessage(key, (user||'').toLowerCase(), msg, type).catch(() => {});
    }
}

export function isUserAuthorized(userstate, channel) {
    const display = (userstate['display-name'] || '').toLowerCase();
    const name = (userstate['username'] || '').toLowerCase();
    const channelName = (channel || '').replace(/^#/, '').toLowerCase();
    if (name && channelName && name === channelName) return true;
    if (userstate && userstate.mod) return true;
    const auth = getAuthorizedUsers();
    return auth.some(u => (u || '').toLowerCase() === display || (u || '').toLowerCase() === name);
}

export function isChannelOwnerOrMod(userstate, channel) {
    const channelName = channel.replace(/^#/, '').toLowerCase();
    const username = (userstate['username'] || '').toLowerCase();
    const isOwner = username === channelName;
    const isMod = !!userstate.mod;
    return isOwner || isMod;
}

export function registerHandlers(client) {
    client.on('message', async (channel, userstate, message, self) => {
        if (self) return;
        const commandName = message.trim();

    try { pushMessageToContext(channel, userstate['display-name'] || userstate['username'], message, 'chat'); } catch (e) { console.error('Error saving message context:', e); }

        if (commandName === '!context') {
            if (!isUserAuthorized(userstate, channel)) return;
            const key = channel.replace(/^#/, '');
            const ctx = messageContext[key] || [];
            if (ctx.length === 0) { await client.say(channel, 'There are no messages in the context for this channel.'); return; }
            const lines = ctx.map(m => `${m.ts.split('T')[0]} ${m.user}: ${m.message}`);
            for (const line of lines) await client.say(channel, line);
            return;
        }

        if (commandName === '!reset_context') {
            if (!isUserAuthorized(userstate, channel)) return;
            const key = channel.replace(/^#/, '');
            messageContext[key] = [];
            await deleteMessagesForChannel(key);
            await client.say(channel, `@${userstate['display-name'] || userstate['username']}, context reset for this channel.`);
            console.log(`Context reset for channel [${key}] by ${userstate['display-name'] || userstate['username']}`);
            return;
        }

        if (commandName === '!help') {
            const helpLines = [
                'Commands: !context, !reset_context, !add_user <username>, !remove_user <username>, !list_users, !trovabot_off, !trovabot_on, !event <year> <summary>',
                'Authorization: most commands require authorization. Use !help for this message.'
            ];
            for (const line of helpLines) await client.say(channel, line);
            return;
        }

        const botState = getBotState();
        const isAdminCommand = commandName.startsWith('!add_user') || commandName.startsWith('!remove_user') || commandName === '!list_users' || commandName === '!trovabot_off' || commandName === '!trovabot_on';
        if (!botState.enabled && !isAdminCommand) return;

        if (commandName.startsWith('!add_user ')) {
            if (!isChannelOwnerOrMod(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, only the channel owner or moderators can add authorized users.`); return; }
            const parts = message.split(' ');
            if (parts.length < 2) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, use: !add_user <username>`); return; }
            const userToAdd = parts[1];
            const norm = normalizeUsername(userToAdd);
            const ok = await addAuthorizedUserDB(norm);
            if (ok) await client.say(channel, `User @${norm} added to authorized list.`);
            else await client.say(channel, `Could not add @${norm} (already exists or invalid).`);
            return;
        }

        if (commandName.startsWith('!remove_user ')) {
            if (!isChannelOwnerOrMod(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, only the channel owner or moderators can remove authorized users.`); return; }
            const parts = message.split(' ');
            if (parts.length < 2) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, use: !remove_user <username>`); return; }
            const userToRemove = parts[1];
            const normRem = normalizeUsername(userToRemove);
            const ok = await removeAuthorizedUserDB(normRem);
            if (ok) await client.say(channel, `User @${normRem} removed from authorized list.`);
            else await client.say(channel, `Could not remove @${normRem} (not found).`);
            return;
        }

        if (commandName === '!list_users') {
            if (!isChannelOwnerOrMod(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, only the channel owner or moderators can list authorized users.`); return; }
            const auth = getAuthorizedUsers();
            if (!auth || auth.length === 0) { await client.say(channel, 'No authorized users.'); return; }
            const shown = auth.map(u => `@${(u||'').toLowerCase()}`);
            await client.say(channel, `Authorized users: ${shown.join(', ')}`);
            return;
        }

        if (commandName === '!trovabot_off') {
            if (!isChannelOwnerOrMod(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, only the channel owner or moderators can turn off Trovabot.`); return; }
            const newState = { enabled: false };
            await upsertBotState(newState);
            await client.say(channel, `Trovabot turned off. Only admin commands will remain active.`);
            console.log(`Trovabot disabled by ${userstate['display-name'] || userstate['username']}`);
            return;
        }

        if (commandName === '!trovabot_on') {
            if (!isChannelOwnerOrMod(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, only the channel owner or moderators can turn on Trovabot.`); return; }
            const newState = { enabled: true };
            await upsertBotState(newState);
            await client.say(channel, `Trovabot turned on.`);
            console.log(`Trovabot enabled by ${userstate['display-name'] || userstate['username']}`);
            return;
        }

        if (commandName.startsWith('!event ')) {
            if (!isUserAuthorized(userstate, channel)) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, you are not authorized to use this command.`); return; }
            const parts = message.split(' ');
            if (parts.length < 3) { await client.say(channel, `@${userstate['display-name'] || userstate['username']}, incorrect format. Use: !event <year> <event summary>`); return; }
            const year = parts[1];
            const summary = parts.slice(2).join(' ');
            const key = channel.replace(/^#/, '');
            const ctx = (messageContext[key] || []).filter(m => (m.type || 'chat') === 'event');

            try {
                pushMessageToContext(channel, userstate['display-name'] || userstate['username'], message, 'event');
            } catch (e) { console.error('Error inserting event message into context:', e); }

            const trova = await generarTrova(year, summary, ctx);
            await client.say(channel, trova);
            console.log(`Response sent to [${channel}]: ${trova}`);
            return;
        }
    });

    client.on('connected', (addr, port) => {
        console.log(`* Conectado a ${addr}:${port}`);
        console.log(`El Trovador Bot está listo en los canales: ${process.env.TARGET_CHANNELS}`);
    });
}
