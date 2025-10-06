(# Trovabot)


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
(- Node.js 18+ (o la versión que tengas disponible). Comprueba con `node -v`.)
(- Una cuenta de desarrollador en Twitch (Client ID y Client Secret).)
(- Un API key para la librería `@google/generative-ai` (Gemini) y/o credenciales necesarias.)
(- Variables de entorno definidas en un archivo `.env` en la raíz del proyecto.)

(## Instalación)

(1. Clona el repositorio o copia los archivos en tu máquina.)
(2. Desde la carpeta del proyecto instala las dependencias:)

(```bash)
(npm install)
(```)

(## Configuración (.env))

(En la raíz del proyecto crea un archivo `.env` con las siguientes variables (ejemplo):)

(```bash)
(# Twitch)
(TWITCH_APP_ID=tu_twitch_client_id)
(TWITCH_APP_SECRET=tu_twitch_client_secret)
(TWITCH_BOT_USERNAME=nombre_de_tu_bot_en_twitch)
(TWITCH_ACCESS_TOKEN='aquí_irá_el_token_que_obtengas')
(TARGET_CHANNELS=canal1,canal2)
# Trovabot

Un bot sencillo de Twitch que actúa como un "trovador" medieval: toma un año y la descripción de un suceso (comando `!evento`) y genera una copla/poema breve usando la API de generación de texto (Gemini) para narrarlo con estilo.

## Contenido

- `bot.js` - Lógica principal del bot de Twitch (usa `tmi.js` y la API de Gemini).
- `obtener_token.js` - Script temporal para obtener el token de acceso OAuth de Twitch.
- `package.json` - Dependencias del proyecto.

## Requisitos

- Node.js 18+ (o la versión que tengas disponible). Comprueba con `node -v`.
- Una cuenta de desarrollador en Twitch (Client ID y Client Secret).
- Un API key para la librería `@google/generative-ai` (Gemini) y/o credenciales necesarias.
- Variables de entorno definidas en un archivo `.env` en la raíz del proyecto.

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
TARGET_CHANNELS=canal1,canal2

# Gemini / Google Generative AI
GEMINI_API_KEY=tu_api_key_de_gemini
```

Notas:
- `TARGET_CHANNELS` debe ser una lista separada por comas. Ejemplo: `mi_canal` o `canal1,canal2`.
- Inicialmente sólo necesitas `TWITCH_APP_ID` y `TWITCH_APP_SECRET` para ejecutar `obtener_token.js` y obtener `TWITCH_ACCESS_TOKEN`.

## Obtener el token de Twitch (paso a paso)

1. Abre una terminal y ejecuta:

```bash
npm run token
```

o directamente:

```bash
node obtener_token.js
```

2. El script levantará un servidor temporal en `http://localhost:3000` y mostrará una URL de autorización.
3. Abre la URL en el navegador, autoriza la aplicación y Twitch redirigirá a `http://localhost:3000/?code=...`.
4. `obtener_token.js` intercambiará el `code` por un `access_token` y un `refresh_token`.

 - El script intentará guardar automáticamente `TWITCH_ACCESS_TOKEN` y `TWITCH_REFRESH_TOKEN` en tu archivo `.env`. Si no puede escribir en `.env`, imprimirá las líneas en la consola para que las pegues manualmente.

Importante: el `access_token` puede expirar, pero el `refresh_token` puede usarse para generar uno nuevo (el proceso automático está implementado). Si al usar el bot ves errores de autenticación, ejecuta `npm run token` de nuevo o revisa los logs.

## Uso del bot


Asegúrate de tener `.env` con `TWITCH_BOT_USERNAME`, `TWITCH_ACCESS_TOKEN`, `TWITCH_REFRESH_TOKEN`, `TARGET_CHANNELS` y `GEMINI_API_KEY` configurados.

Ejecuta el bot:

```bash
npm run start
```

o directamente:

```bash
node bot.js
```

Comportamiento de refresh token:

- Si en tu `.env` existe `TWITCH_REFRESH_TOKEN`, `bot.js` intentará, al arrancar, renovar el `TWITCH_ACCESS_TOKEN` usando la API de Twitch y actualizará `.env` con los nuevos valores (si el refresh tiene éxito). Esto evita tener que ejecutar manualmente `obtener_token.js` cada vez que caduque el token.

Comandos disponibles en el chat (desde cualquier usuario, según permisos del canal):

- `!evento <año> <resumen del evento>` - El bot generará una copla breve para el suceso indicado y la enviará al chat.

Ejemplo en chat:

```
!evento 1066 Guillermo invadió Inglaterra y ganó la batalla
```

El bot responderá con una copla breve elaborada por Gemini.

## Errores comunes y solución de problemas

- Si `obtener_token.js` falla al intercambiar el código:
	- Verifica `TWITCH_APP_ID` y `TWITCH_APP_SECRET` en `.env`.
	- Asegúrate de que la URL de redirección (`http://localhost:3000`) esté permitida en la configuración de la app de Twitch.

- Si `bot.js` muestra errores de autenticación al conectar:
	- Asegúrate de que `TWITCH_ACCESS_TOKEN` esté presente en `.env` y sea válido.
	- Repite el proceso con `obtener_token.js` si el token expiró.

- Si hay errores al contactar la API de Gemini:
	- Verifica `GEMINI_API_KEY`.
	- Revisa límites de uso y posibles errores de la API en la respuesta.

## Archivos añadidos

- `.env.example` - plantilla con las variables de entorno necesarias (ahora incluye `TWITCH_REFRESH_TOKEN`).
- `.gitignore` - ya incluido en el repo para ignorar `node_modules` y archivos sensibles.

## Mejoras y siguientes pasos (opcional)

- Añadir manejo de refresh tokens para renovar `TWITCH_ACCESS_TOKEN` automáticamente.
- Añadir rate-limiting y protección para evitar spam de comandos en chat.
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

---

Si quieres que añada ejemplos de outputs, comandos administradores o fragmentos de `.env.example`, dime qué incluir y lo actualizo.
