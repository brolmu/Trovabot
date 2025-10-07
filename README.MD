# Trovabot

Un bot de Twitch que actúa como un trovador medieval: toma un año y la descripción de un suceso (comando `!event`) y genera una copla/poema breve utilizando la API de generación de texto (Gemini / `@google/generative-ai`).

El bot guarda mensajes del chat en Supabase y usa una lista de usuarios autorizados para controlar quién puede solicitar eventos. Incluye comandos de administración para gestionar usuarios y el estado del bot.

## Resumen rápido

- Archivo principal: `src/main.js`
- Estructura del proyecto: código fuente en carpeta `src/`
- Base de datos: Supabase (Postgres) para usuarios autorizados, mensajes y estado del bot
- Ver `README_MIGRATION.md` para instrucciones de migración de Supabase

## Requisitos

- Node.js 18+ (verifica con `node -v`).
- Cuenta de desarrollador en Twitch (Client ID y Client Secret).
- API key para `@google/generative-ai` (Gemini) en `GEMINI_API_KEY`.
- Proyecto en Supabase configurado con las tablas necesarias (ver sección de configuración).
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

# Supabase (requerido)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key_de_supabase
# o alternativamente:
# SUPABASE_KEY=tu_service_key_de_supabase
```

Notas:
- `TARGET_CHANNELS` debe ser una lista separada por comas, por ejemplo: `mi_canal` o `canal1,canal2`.
- Para obtener tokens de Twitch, sigue las instrucciones de autenticación OAuth2 de Twitch.
- El bot requiere Supabase para funcionar. Si falta la configuración, el bot no arrancará.

## Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Ve a la configuración del proyecto y obtén:
   - `SUPABASE_URL` (API URL)
   - `SUPABASE_SERVICE_KEY` (service_role key)
3. Ejecuta la migración SQL para crear las tablas necesarias. Ver `README_MIGRATION.md` para instrucciones detalladas.
4. Las tablas creadas serán:
   - `authorized_users` — lista de usuarios autorizados para ejecutar comandos
   - `messages` — almacenamiento de mensajes del chat
   - `bot_state` — estado global del bot (habilitado/deshabilitado)

## Obtener el token de Twitch

Para obtener `TWITCH_ACCESS_TOKEN` y `TWITCH_REFRESH_TOKEN`:

1. Registra una aplicación en [Twitch Developers](https://dev.twitch.tv/console/apps).
2. Usa el flujo OAuth2 de Twitch para obtener tokens con los scopes necesarios: `chat:read`, `chat:edit`.
3. Guarda los tokens en tu archivo `.env`.

El bot intenta refrescar automáticamente el `access_token` al arrancar si encuentra `TWITCH_REFRESH_TOKEN` en `.env`.

## Arrancar el bot

```bash
npm run start
# o
node src/main.js
```

## Comandos del bot

### Comandos de usuario autorizado

- `!event <year> <event summary>`
	- Genera una copla breve con el evento usando Gemini y la publica en el chat.
	- Sólo usuarios autorizados pueden ejecutar este comando.
	- El bot responderá si el usuario no está autorizado.

- `!context`
	- Devuelve los últimos mensajes guardados para el canal (desde Supabase).
	- También limitado a usuarios autorizados.

- `!reset_context`
	- Limpia todos los mensajes guardados para el canal actual.
	- Requiere autorización.

### Comandos de administración (owner/moderadores del canal)

- `!add_user <username>`
	- Añade un usuario a la lista de usuarios autorizados.
	- Solo el owner del canal o moderadores pueden ejecutar este comando.

- `!remove_user <username>`
	- Elimina un usuario de la lista de usuarios autorizados.
	- Solo el owner del canal o moderadores pueden ejecutar este comando.

- `!list_users`
	- Lista todos los usuarios autorizados.
	- Solo el owner del canal o moderadores pueden ejecutar este comando.

- `!trovabot_off`
	- Desactiva el bot (solo comandos de administración seguirán funcionando).
	- Solo el owner del canal o moderadores pueden ejecutar este comando.

- `!trovabot_on`
	- Reactiva el bot.
	- Solo el owner del canal o moderadores pueden ejecutar este comando.

### Otros comandos

- `!help`
	- Muestra la lista de comandos disponibles.
	- Disponible para todos los usuarios.

## Almacenamiento de contexto

El bot guarda todos los mensajes del chat en la tabla `messages` de Supabase con los siguientes campos:

- `channel` — nombre del canal
- `username` — nombre del usuario
- `message` — contenido del mensaje
- `type` — tipo de mensaje ('chat' o 'event')
- `ts` — timestamp del mensaje

Esto permite que el comando `!context` recupere las interacciones recientes del canal. El contexto de eventos previos se usa para generar coplas con referencias históricas.

## Lista de usuarios autorizados

Los usuarios autorizados se almacenan en la tabla `authorized_users` de Supabase. Ya no es necesario editar archivos JSON manualmente.

### Gestión de usuarios autorizados

- Usa `!add_user <username>` para añadir usuarios (solo owner/moderadores).
- Usa `!remove_user <username>` para eliminar usuarios (solo owner/moderadores).
- Usa `!list_users` para ver la lista actual (solo owner/moderadores).

### Permisos automáticos

Además de los usuarios en la base de datos, tienen autorización automática:
- El owner del canal (broadcaster)
- Los moderadores del canal

La comparación de nombres es case-insensitive.

## Depuración y problemas comunes

- **El bot no arranca**: 
  - Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (o `SUPABASE_KEY`) estén configurados en `.env`.
  - Asegúrate de haber ejecutado la migración SQL (`migrate.sql`) para crear las tablas necesarias.
  
- **No conecta al chat**: 
  - Revisa `TWITCH_ACCESS_TOKEN` y `TWITCH_BOT_USERNAME` en `.env`.
  - Verifica que los tokens tengan los scopes correctos: `chat:read` y `chat:edit`.

- **El token expira**: 
  - El bot intenta refrescar automáticamente el token si `TWITCH_REFRESH_TOKEN` está presente y válido.
  - Si el refresh falla, necesitarás obtener nuevos tokens manualmente.

- **`!event` no responde para un usuario**: 
  - Usa `!list_users` para verificar si el usuario está en la lista de autorizados.
  - Usa `!add_user <username>` para añadirlo (requiere permisos de owner/moderador).
  - Los moderadores y el owner del canal siempre están autorizados automáticamente.

## Archivos importantes

- `src/main.js` — punto de entrada del bot.
- `src/main_impl.js` — lógica de arranque y refresh de tokens.
- `src/handlers.js` — gestión de comandos del chat y lógica del bot.
- `src/db.js` — integración con Supabase para usuarios, mensajes y estado.
- `src/config.js` — carga de variables de entorno.
- `src/utils.js` — funciones utilitarias y generación de coplas con Gemini.
- `migrate.sql` — script SQL para crear las tablas necesarias en Supabase.
- `README_MIGRATION.md` — guía para ejecutar la migración de Supabase.

## Funcionalidades implementadas

- ✅ Comandos de administración (`!add_user`, `!remove_user`, `!list_users`) protegidos por permisos (broadcaster/mods).
- ✅ Control de estado del bot (`!trovabot_on`, `!trovabot_off`) para activar/desactivar funcionalidades.
- ✅ Contexto histórico de eventos integrado en el prompt de Gemini para generar coplas con referencias recientes.
- ✅ Almacenamiento persistente en Supabase para usuarios, mensajes y estado del bot.
- ✅ Refresh automático de tokens de Twitch.

## Mejoras futuras

- Añadir tests unitarios y de integración.
- Implementar logging estructurado para auditoría de comandos.
- Añadir límites de rate para comandos que consumen API de Gemini.

## Licencia

Revisa el archivo `LICENSE` incluido en el repositorio.
