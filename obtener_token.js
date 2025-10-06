// obtener_token.js
require('dotenv').config();
const http = require('http');
const axios = require('axios');
const url = require('url');

const clientId = process.env.TWITCH_APP_ID; // ¡Asegúrate de tener estos en tu .env!
const clientSecret = process.env.TWITCH_APP_SECRET; // ¡Asegúrate de tener estos en tu .env!
const redirectUri = 'http://localhost:3000';
const scopes = 'chat:read chat:edit'; // Permisos que nuestro bot necesita

if (!clientId || !clientSecret) {
    console.error("ERROR: Por favor, añade TWITCH_APP_ID y TWITCH_APP_SECRET a tu archivo .env");
    process.exit(1);
}

// 1. Crear la URL de autorización
const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;

// 2. Iniciar un servidor temporal para recibir el código
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/' && parsedUrl.query.code) {
        const code = parsedUrl.query.code;
        console.log('\n[Paso 3] Código de autorización recibido. Solicitando token de acceso...');

        try {
            // 3. Intercambiar el código por un token de acceso
            const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri
                }
            });

            const accessToken = tokenResponse.data.access_token;
            const refreshToken = tokenResponse.data.refresh_token;

            // Intentar escribir/actualizar en .env
            try {
                const fs = require('fs');
                const envPath = require('path').resolve(process.cwd(), '.env');
                let envContent = '';
                if (fs.existsSync(envPath)) {
                    envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
                }

                // Función que actualiza o añade una variable en el contenido del .env
                function upsertEnv(content, key, value) {
                    const re = new RegExp(`^${key}=.*$`, 'm');
                    const line = `${key}='${value}'`;
                    if (re.test(content)) {
                        return content.replace(re, line);
                    } else {
                        return content + (content && content.slice(-1) !== '\n' ? '\n' : '') + line + '\n';
                    }
                }

                envContent = upsertEnv(envContent, 'TWITCH_ACCESS_TOKEN', accessToken);
                envContent = upsertEnv(envContent, 'TWITCH_REFRESH_TOKEN', refreshToken);

                fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });

                console.log('\n✅ ¡TOKENS GUARDADOS EN .env CON ÉXITO! ✅\n');
                console.log('Se añadieron/actualizaron las variables TWITCH_ACCESS_TOKEN y TWITCH_REFRESH_TOKEN en .env');

                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('¡Token recibido y guardado en .env! Puedes cerrar esta ventana y volver a la terminal.');

            } catch (fsErr) {
                console.log('\n⚠️ No se pudo escribir en .env automáticamente.');
                console.log('Copia manualmente las siguientes líneas en tu .env:');
                console.log('----------------------------------------------------');
                console.log(`TWITCH_ACCESS_TOKEN='${accessToken}'`);
                console.log(`TWITCH_REFRESH_TOKEN='${refreshToken}'`);
                console.log('----------------------------------------------------');

                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('¡Token recibido! Revisa la terminal para copiar los valores en .env.');
            }

        } catch (error) {
            console.error('\n❌ Error al obtener el token:', error.response ? error.response.data : error.message);
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Error al obtener el token. Revisa la consola del script.');
        } finally {
            server.close();
            process.exit(0);
        }
    }
});

server.listen(3000, () => {
    console.log('[Paso 1] Script de obtención de token iniciado en http://localhost:3000');
    console.log('\n[Paso 2] Abre la siguiente URL en tu navegador para autorizar la aplicación:');
    console.log(authUrl);
});