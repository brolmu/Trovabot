#!/usr/bin/env node
/*
  scripts/generate_twitch_token.js

  Usage:
    TWITCH_APP_ID=... TWITCH_APP_SECRET=... node scripts/generate_twitch_token.js --client_credentials
    TWITCH_APP_ID=... TWITCH_APP_SECRET=... TWITCH_REFRESH_TOKEN=... node scripts/generate_twitch_token.js --refresh

  This script can:
   - Exchange a refresh token for a new access token (and new refresh token) using grant_type=refresh_token
   - Obtain an app access token using grant_type=client_credentials

  It prints JSON to stdout with the response data.
*/

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
// Basic flag parsing
const rawArgs = process.argv.slice(2);
const argv = {
  refresh: false,
  client_credentials: false,
  auth: false,
  save: false,
  help: false
};
let redirectOverride = null;
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  const arg = a.replace(/^--?/, '');
  if (arg === 'refresh' || arg === 'r') argv.refresh = true;
  if (arg === 'client_credentials' || arg === 'client_credentials' || arg === 'c') argv.client_credentials = true;
  if (arg === 'auth' || arg === 'a') argv.auth = true;
  if (arg === 'save' || arg === 's') argv.save = true;
  if (arg === 'help' || arg === 'h') argv.help = true;
  if (a.startsWith('--redirect=')) redirectOverride = a.split('=')[1];
  if (arg === 'redirect' || arg === 'r') {
    const next = rawArgs[i+1];
    if (next && !next.startsWith('-')) { redirectOverride = next; i++; }
  }
}

const clientId = process.env.TWITCH_APP_ID;
const clientSecret = process.env.TWITCH_APP_SECRET;
const refreshToken = process.env.TWITCH_REFRESH_TOKEN;

if (!clientId || !clientSecret) {
  console.error('TWITCH_APP_ID and TWITCH_APP_SECRET must be set in environment.');
  process.exit(2);
}

async function exchangeRefreshToken() {
  if (!refreshToken) {
    console.error('TWITCH_REFRESH_TOKEN must be set to use --refresh');
    process.exit(2);
  }
  try {
    const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('Error exchanging refresh token:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

async function getAppAccessToken() {
  try {
    const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (err) {
    console.error('Error requesting app access token:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}


async function runAuthFlow(redirectOverride) {
  const redirectUri = redirectOverride || process.env.REDIRECT_URI || 'http://localhost:3000/callback';
  const clientId = process.env.TWITCH_APP_ID;
  const clientSecret = process.env.TWITCH_APP_SECRET;
  const scope = process.env.SCOPE || 'chat:read chat:edit';

  if (!clientId || !clientSecret) {
    console.error('TWITCH_APP_ID and TWITCH_APP_SECRET must be set in environment.');
    process.exit(2);
  }

  // Start a local server to capture the redirect
  const http = await import('http');

  // Parse redirect URI and determine port/host base for URL resolution
  let parsedRedirect;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch (e) {
    console.error('Invalid REDIRECT_URI:', redirectUri);
    process.exit(2);
  }
  const port = parsedRedirect.port ? Number(parsedRedirect.port) : 3000;
  const baseHost = `${parsedRedirect.protocol}//${parsedRedirect.hostname}${parsedRedirect.port ? ':' + parsedRedirect.port : ''}`;

  const server = http.createServer((req, res) => {
    try {
      const reqUrl = new URL(req.url, baseHost);
      const params = Object.fromEntries(reqUrl.searchParams.entries());
      if (params.error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authorization error</h1><p>${params.error}</p>`);
        server.emit('oauth_error', params);
        return;
      }
      if (params.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful</h1><p>You can close this window and return to the terminal.</p>');
        server.emit('oauth_code', params.code);
        return;
      }
    } catch (e) {
      // fallback response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Trovabot token generator</h1>');
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));

  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  console.log('\nMake sure this exact Redirect URI is registered in your Twitch application settings:');
  console.log('  ' + redirectUri + '\n');
  console.log('Opening browser to:', authUrl);
  // Open browser
  const { exec } = await import('child_process');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${authUrl}"`);

  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for OAuth redirect (2 minutes)')), 120000);
    server.once('oauth_error', (err) => {
      clearTimeout(timeout);
      reject(new Error('OAuth error: ' + JSON.stringify(err)));
    });
    server.once('oauth_code', (c) => {
      clearTimeout(timeout);
      resolve(c);
    });
  }).finally(() => server.close());

  try {
    const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    });
    console.log('Token response:', JSON.stringify(resp.data, null, 2));
    if (argv.save) {
      // upsert to .env similar to main_impl
      const fs = await import('fs');
      const path = await import('path');
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, { encoding: 'utf8' });
      function upsertEnv(content, key, value) {
        const re = new RegExp(`^${key}=.*$`, 'm');
        const line = `${key}='${value}'`;
        if (re.test(content)) return content.replace(re, line);
        else return content + (content && content.slice(-1) !== '\n' ? '\n' : '') + line + '\n';
      }
      envContent = upsertEnv(envContent, 'TWITCH_ACCESS_TOKEN', resp.data.access_token);
      if (resp.data.refresh_token) envContent = upsertEnv(envContent, 'TWITCH_REFRESH_TOKEN', resp.data.refresh_token);
      fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
      console.log('Saved tokens to .env');
    }
  } catch (err) {
    console.error('Error exchanging code for token:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

(async function main() {
  if (argv.help) {
    console.log('Usage: TWITCH_APP_ID=... TWITCH_APP_SECRET=... node scripts/generate_twitch_token.js --client_credentials');
    console.log('       TWITCH_APP_ID=... TWITCH_APP_SECRET=... TWITCH_REFRESH_TOKEN=... node scripts/generate_twitch_token.js --refresh');
    console.log('       TWITCH_APP_ID=... TWITCH_APP_SECRET=... node scripts/generate_twitch_token.js --auth --redirect=http://localhost:3000/callback --save');
    process.exit(0);
  }
  if (argv.refresh) {
    await exchangeRefreshToken();
    return;
  }
  if (argv.client_credentials) {
    await getAppAccessToken();
    return;
  }
  if (argv.auth) {
    await runAuthFlow(redirectOverride);
    return;
  }
  console.error('Please specify --refresh, --client_credentials or --auth');
  process.exit(2);
})();
