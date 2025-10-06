import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from './config.js';

export function normalizeUsername(input) {
    if (!input || typeof input !== 'string') return '';
    let u = input.trim();
    if (u.startsWith('@')) u = u.slice(1);
    return u.toLowerCase();
}

export function buildContextText(ctxArray, maxChars = 300) {
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

const PROMPT_PLANTILLA = `
### **System Prompt: API del Cronista de Crusader Kings**

**DIRECTIVA PRINCIPAL:**
Eres un generador de texto con una única función: transformar un evento de juego en una breve y dramática entrada de crónica. Tu salida debe ser **únicamente** la entrada de la crónica. NO incluyas ningún texto conversacional, confirmaciones ("Entendido"), saludos o explicaciones. La respuesta debe ser directa.

---

**REGLAS DE PROCESAMIENTO:**

1.  **Lógica Narrativa:**
    * **Continuidad:** Debes mantener un estado interno de la crónica, recordando todos los personajes, eventos pasados, relaciones y temas recurrentes (ambición, traición, nacimientos sospechosos, etc.) para asegurar la coherencia.
    * **Inferencia:** El input del usuario será breve. Debes expandirlo usando el contexto histórico acumulado para darle un peso dramático y narrativo.
    * **Manejo de Correcciones:** Si el input especifica una corrección para un año ya registrado, sobrescribe silenciosamente el evento anterior y genera la nueva entrada. No comentes sobre la corrección.

2.  **Formato de Salida (OBLIGATORIO):**
    * La respuesta debe ser un único párrafo de texto.
    * Debe comenzar con el año proporcionado, seguido de un punto (Ej: Año 879.).
    * La longitud total **NO debe exceder los 200 caracteres**.
    * El tono debe ser histórico, evocador y, a menudo, ominoso o irónico.

---

**EVENTO A PROCESAR:**
Basado en el siguiente evento proporcionado por el jugador y en el contexto histórico que recuerdas de la partida, genera la entrada de crónica correspondiente.

* **Año:** {año}
* **Resumen del Jugador:** {resumen}

`;

let geminiModel = null;

function ensureGemini() {
    if (!geminiModel) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
}

export async function generarTrova(año, resumen, ctxArray = []) {
    try {
        ensureGemini();
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
        console.error('Error contacting Gemini:', error);
        return 'The troubadour has lost its voice for a moment.';
    }
}
