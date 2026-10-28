export async function obtenerInfoDiscoGemini(banda, disco) {
    const apiKey = "AQ.Ab8RN6IakP-0Doju1gGtZx6R51m2h8Az2Bb8KCVAVqJ4j04Kyg";

    const prompt = `
Eres un experto musical.

Quiero información sobre:
- Banda: "${banda}"
- Disco: "${disco}"

Devuélveme:
1) Listado de canciones del disco (si existe).
2) Si la banda está de gira por España este año.
3) Fechas y ciudades si las hay.
4) Nivel de certeza de la información.

Formato de salida SIEMPRE en JSON:

{
  "banda": "...",
  "disco": "...",
  "canciones": [
    {"num": 1, "titulo": "..."}
  ],
  "gira_espana": {
    "hay_gira": true/false,
    "fechas": [
      {"ciudad": "...", "recinto": "...", "fecha": "..."}
    ],
    "nota": "..."
  }
}
    `;

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
        }
    );

    const data = await response.json();

    try {
        return JSON.parse(data.candidates[0].content[0].text);
    } catch (e) {
        console.error("Error parseando JSON de Gemini:", e);
        return null;
    }
}
