require('dotenv').config();
const tmi = require('tmi.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const AUTH_USERS_FILE = path.join(DATA_DIR, 'authorized_users.json');
const MESSAGE_CONTEXT_FILE = path.join(DATA_DIR, 'message_context.json');

let authorizedUsers = [];
try {
    if (fs.existsSync(AUTH_USERS_FILE)) {
        authorizedUsers = JSON.parse(fs.readFileSync(AUTH_USERS_FILE, 'utf8')) || [];
    } else {
        fs.writeFileSync(AUTH_USERS_FILE, JSON.stringify([], null, 2), 'utf8');
        authorizedUsers = [];
    }
} catch (e) {
    console.error('No se pudo leer/crear authorized_users.json:', e);
    authorizedUsers = [];
}

let messageContext = {};
try {
    if (fs.existsSync(MESSAGE_CONTEXT_FILE)) {
        messageContext = JSON.parse(fs.readFileSync(MESSAGE_CONTEXT_FILE, 'utf8')) || {};
    } else {
        fs.writeFileSync(MESSAGE_CONTEXT_FILE, JSON.stringify({}, null, 2), 'utf8');
        messageContext = {};
    }
} catch (e) {
    console.error('No se pudo leer/crear message_context.json:', e);
    messageContext = {};
}

let saveTimeout = null;
function scheduleSaveContext() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(MESSAGE_CONTEXT_FILE, JSON.stringify(messageContext, null, 2), 'utf8');
        } catch (e) {
            console.error('Error al guardar message_context.json:', e);
        }
    }, 500);
}

function pushMessageToContext(channel, user, message) {
    const key = channel.replace(/^#/, '');
    if (!messageContext[key]) messageContext[key] = [];
    messageContext[key].push({ user, message, ts: new Date().toISOString() });
    if (messageContext[key].length > 5) messageContext[key].shift();
    scheduleSaveContext();
}

function isUserAuthorized(userstate) {
    const display = (userstate['display-name'] || '').toLowerCase();
    const name = (userstate['username'] || '').toLowerCase();
    return authorizedUsers.some(u => (u || '').toLowerCase() === display || (u || '').toLowerCase() === name);
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function refreshTwitchTokenIfNeeded() {
    const clientId = process.env.TWITCH_APP_ID;
    const clientSecret = process.env.TWITCH_APP_SECRET;
    const refreshToken = process.env.TWITCH_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        return;
    }

    try {
        console.log('Intentando refrescar TWITCH_ACCESS_TOKEN usando TWITCH_REFRESH_TOKEN...');
        const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
            }
        });

        const newAccessToken = resp.data.access_token;
        const newRefreshToken = resp.data.refresh_token || refreshToken;

        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
        }

        function upsertEnv(content, key, value) {
            const re = new RegExp(`^${key}=.*$`, 'm');
            const line = `${key}='${value}'`;
            if (re.test(content)) {
                return content.replace(re, line);
            } else {
                return content + (content && content.slice(-1) !== '\n' ? '\n' : '') + line + '\n';
            }
        }

        envContent = upsertEnv(envContent, 'TWITCH_ACCESS_TOKEN', newAccessToken);
        envContent = upsertEnv(envContent, 'TWITCH_REFRESH_TOKEN', newRefreshToken);

        fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

        process.env.TWITCH_ACCESS_TOKEN = newAccessToken;

        console.log('✅ TWITCH_ACCESS_TOKEN actualizado desde refresh token.');
    } catch (err) {
        console.error('No se pudo refrescar el token de Twitch:', err.response ? err.response.data : err.message);
    }
}

const refreshPromise = refreshTwitchTokenIfNeeded();

const client = new tmi.Client({
    options: { debug: true, messagesLogLevel: "info" },
    identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_ACCESS_TOKEN 
    },
    channels: process.env.TARGET_CHANNELS.split(',')
});


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const PROMPT_PLANTILLA = `
Eres un trovador medieval, un juglar que narra los grandes sucesos de los reinos en el juego Crusader Kings.
Tu tarea es tomar el año y la descripción de un evento y convertirlo en un breve poema o una copla de trovador,
con un estilo épico, dramático o a veces humorístico, como si lo cantaras en la corte de un gran señor.

Sé breve y conciso, ideal para ser leído rápidamente en un chat de Twitch. No excedas los 450 caracteres.

Aquí está el suceso que debes narrar:
Año del suceso: {año}
Descripción del evento: {resumen}

Ahora, ¡canta para nosotros, juglar!
`;

function buildContextText(ctxArray, maxChars = 300) {
    if (!Array.isArray(ctxArray) || ctxArray.length === 0) return '';
    const items = ctxArray.slice(-5).map(m => `${m.user}: ${m.message}`);
    let joined = items.join(' | ');
    if (joined.length <= maxChars) return joined;
    joined = joined.slice(0, maxChars);
    const lastSpace = joined.lastIndexOf(' ');
    if (lastSpace > 0) joined = joined.slice(0, lastSpace) + '...';
    else joined = joined + '...';
    return joined;
}

async function generarTrova(año, resumen, ctxArray = []) {
    try {
        const contextoText = buildContextText(ctxArray, 300);

        let promptCompleto = PROMPT_PLANTILLA;
        if (contextoText) {
            promptCompleto = `Contexto reciente: ${contextoText}\n\n` + promptCompleto;
        }
        promptCompleto = promptCompleto
            .replace('{año}', año)
            .replace('{resumen}', resumen);

        const result = await geminiModel.generateContent(promptCompleto);
        const response = await result.response;
        let trova = response.text().trim().replace(/\n/g, ' ');

        if (trova.length > 480) {
            trova = trova.substring(0, 480) + "...";
        }
        return trova;

    } catch (error) {
        console.error("Error al contactar a Gemini:", error);
        return "El trovador se ha quedado sin voz por un momento, ¡cosas de la corte!";
    }
}

function onMessageHandler(channel, userstate, message, self) {
    if (self) { return; }

    const commandName = message.trim();

    try {
        pushMessageToContext(channel, userstate['display-name'] || userstate['username'], message);
    } catch (e) {
        console.error('Error guardando contexto de mensaje:', e);
    }

    if (commandName === '!contexto') {
        if (!isUserAuthorized(userstate)) {
            return;
        }
        const key = channel.replace(/^#/, '');
        const ctx = messageContext[key] || [];
        if (ctx.length === 0) {
            client.say(channel, 'No hay mensajes en el contexto para este canal.');
            return;
        }
        const lines = ctx.map(m => `${m.ts.split('T')[0]} ${m.user}: ${m.message}`);
        lines.forEach(line => client.say(channel, line));
        return;
    }

    if (commandName.startsWith('!evento ')) {
        if (!isUserAuthorized(userstate)) {
            return;
        }

        const parts = message.split(' ');
        if (parts.length < 3) {
            client.say(channel, `@${userstate['display-name'] || userstate['username']}, formato incorrecto. Usa: !evento <año> <resumen del evento>`);
            return;
        }

        const año = parts[1];
        const resumen = parts.slice(2).join(' ');

        console.log(`Comando !evento en [${channel}] de ${userstate['display-name'] || userstate['username']}. Año: ${año}`);

        const key = channel.replace(/^#/, '');
        const ctx = messageContext[key] || [];
        generarTrova(año, resumen, ctx).then(trova => {
            client.say(channel, trova);
            console.log(`Respuesta enviada a [${channel}]: ${trova}`);
        });
    }
}

function onConnectedHandler(addr, port) {
    console.log(`* Conectado a ${addr}:${port}`);
    console.log(`El Trovador Bot está listo en los canales: ${process.env.TARGET_CHANNELS}`);
}

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

refreshPromise.then(() => {
    client.connect().catch(console.error);
}).catch(() => {
    client.connect().catch(console.error);
});