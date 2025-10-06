# Trovabot

Un bot de Twitch que actúa como un trovador medieval: toma un año y la descripción de un suceso (comando `!evento`) y genera una copla/poema breve utilizando la API de generación de texto (Gemini / `@google/generative-ai`).

Este README incluye las funcionalidades principales y las novedades: el bot guarda los últimos 5 mensajes por canal y usa una lista de usuarios autorizados para controlar quién puede solicitar eventos.

## Resumen rápido

- Archivo principal: `bot.js`
- Script para obtener tokens Twitch: `obtener_token.js`
- Carpeta de datos: `data/` (contiene `authorized_users.json` y `message_context.json`)

## Requisitos

- Node.js 18+ (verifica con `node -v`).
- Cuenta de desarrollador en Twitch (Client ID y Client Secret).
- API key para `@google/generative-ai` (Gemini) en `GEMINI_API_KEY`.
- Archivo `.env` en la raíz con las variables necesarias (ver sección siguiente).

## Instalación

1. Clona el repositorio o copia los archivos en tu máquina.
2. Desde la carpeta del proyecto instala las dependencias:

```bash
npm install
```

## Configuración (.env)

En la raíz del proyecto crea un archivo `.env` con las siguientes variables (ejemplo):

```bash
# Twitch
TWITCH_APP_ID=tu_twitch_client_id
TWITCH_APP_SECRET=tu_twitch_client_secret
TWITCH_BOT_USERNAME=nombre_de_tu_bot_en_twitch
TWITCH_ACCESS_TOKEN='aquí_irá_el_token_que_obtengas'
TWITCH_REFRESH_TOKEN='aquí_irá_el_refresh_token_que_obtengas'
TARGET_CHANNELS=canal1,canal2

# Gemini / Google Generative AI
GEMINI_API_KEY=tu_api_key_de_gemini
```

Notas:
- `TARGET_CHANNELS` debe ser una lista separada por comas, por ejemplo: `mi_canal` o `canal1,canal2`.
- Inicialmente puedes usar `obtener_token.js` para obtener `TWITCH_ACCESS_TOKEN` y `TWITCH_REFRESH_TOKEN`.

## Obtener el token de Twitch

Ejecuta:

```bash
npm run token
```

Sigue las instrucciones en la terminal; el script abrirá una URL de autorización y recibirá el `code` en `http://localhost:3000`. El script intercambiará `code` por `access_token` y `refresh_token` e intentará guardar los valores en `.env`.

El bot intenta refrescar automáticamente el `access_token` al arrancar si encuentra `TWITCH_REFRESH_TOKEN` en `.env`.

## Arrancar el bot

```bash
npm run start
# o
node bot.js
```

## Comandos del bot

- `!evento <año> <resumen del evento>`
	- Genera una copla breve con el evento usando Gemini y la publica en el chat.
	- Sólo usuarios listados en `data/authorized_users.json` pueden ejecutar este comando.
	- Si un usuario no autorizado envía el comando, el bot lo ignorará (sin respuesta).

- `!contexto`
	- Devuelve los últimos 5 mensajes guardados para el canal (desde `data/message_context.json`).
	- También limitado a usuarios autorizados; si un usuario no autorizado lo envía, el bot lo ignorará.

## Almacenamiento de contexto

El bot guarda los últimos 5 mensajes por canal en `data/message_context.json` con la forma:

```json
{
	"canal": [
		{ "user": "usuario", "message": "texto...", "ts": "2025-10-06T21:20:49.245Z" },
		...
	]
}
```

Esto permite que `!contexto` recupere las últimas interacciones del canal. Actualmente el contexto se guarda automáticamente al recibir mensajes, pero no se añade al prompt de Gemini a menos que se haga explícitamente en el código.

## Lista de usuarios autorizados

El archivo `data/authorized_users.json` contiene un array JSON con los nombres (username o display-name) de los usuarios autorizados. Edita este archivo para añadir o quitar permisos.

Ejemplo:

```json
[
	"anivos",
	"brolmu",
	"moderador_ejemplo"
]
```

La comparación es case-insensitive.

Si prefieres, puedo añadir comandos en chat para gestionar esta lista (por ejemplo `!auth add usuario`) y restringir esos comandos sólo al broadcaster/mods.

## Depuración y problemas comunes

- Si no conecta al chat: revisa `TWITCH_ACCESS_TOKEN` y `TWITCH_BOT_USERNAME` en `.env`.
- Si el token expira: ejecuta `npm run token` o confía en el mecanismo de refresh (si `TWITCH_REFRESH_TOKEN` está presente y válido).
- Si `!evento` no responde para un usuario, revisa `data/authorized_users.json` — los usuarios no listados serán ignorados.

## Archivos importantes

- `bot.js` — lógica del bot y control de contexto/autorización.
- `obtener_token.js` — helper para obtener tokens OAuth de Twitch.
- `data/authorized_users.json` — lista de usuarios autorizados.
- `data/message_context.json` — almacenamiento persistente de los últimos 5 mensajes por canal.

## Mejoras sugeridas

- Implementar comandos de administración (`!auth add/remove`) protegidos por permisos (broadcaster/mods).
- Integrar contexto histórico en el prompt de Gemini para generar coplas con referencias recientes (ten en cuenta límites de longitud y privacidad).
- Añadir tests y logging estructurado para auditoría de comandos.

## Licencia

Revisa el archivo `LICENSE` incluido en el repositorio.
