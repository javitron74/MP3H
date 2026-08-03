let datos = [];

if (!window.location.search.includes('v=')) {
    const nuevaURL = window.location.pathname + '?v=' + Date.now();
    window.location.replace(nuevaURL);
}

// Normalizar texto para búsqueda
function normalizar(t) {
    return (t || "").toString().toLowerCase();
}

// Convertir fecha dd/mm/yyyy → Date()
function parseFecha(fecha) {
    if (!fecha) return null;
    const partes = fecha.split("/");
    if (partes.length !== 3) return null;
    const [d, m, y] = partes;
    return new Date(`${y}-${m}-${d}`);
}

// Clase CSS según estado
function claseEstado(estado) {
    switch (estado) {
        case "---":     return "pill-estado---";
        case "Pre-ok":  return "pill-estado-preok";
        case "Ok":      return "pill-estado-ok";
        case "No":      return "pill-estado-no";
        case "Disp":    return "pill-estado-disp";
        default:        return "pill-estado---";
    }
}

function render() {
    const grid = document.getElementById("grid");
    const count = document.getElementById("count");

    const q = normalizar(document.getElementById("search").value);
    const g = document.getElementById("filterGenero").value;
    const e = document.getElementById("filterEstado").value;

    let filtrados = datos.filter(item => {
        const banda = normalizar(item.Banda);
        const disco = normalizar(item.Disco);
        const genero = normalizar(item.Genero);
        const comentarios = normalizar(item.Comentarios);
        const estado = (item.Estado || "").toString();

        const coincideTexto =
            !q ||
            banda.includes(q) ||
            disco.includes(q) ||
            genero.includes(q) ||
            comentarios.includes(q);

        const coincideGenero = !g || genero === normalizar(g);
        const coincideEstado = !e || estado === e;

        return coincideTexto && coincideGenero && coincideEstado;
    });

    // ORDENACIÓN
    const campo = document.getElementById("sortField").value;
    const dir = document.getElementById("sortDir").value;

    if (campo) {

        // Ordenación por Pos
        if (campo === "Pos") {
            filtrados.sort((a, b) => {
                const A = Number(a.Pos);
                const B = Number(b.Pos);
                return dir === "asc" ? A - B : B - A;
            });
        }

        // Ordenación por fecha
        else if (campo === "Emision") {
            filtrados.sort((a, b) => {
                const A = parseFecha(a["Emision Disco"]);
                const B = parseFecha(b["Emision Disco"]);
                return dir === "asc" ? A - B : B - A;
            });
        }

        // Ordenación general
        else {
            filtrados.sort((a, b) => {
                let A = (a[campo] || "").toString().toLowerCase();
                let B = (b[campo] || "").toString().toLowerCase();

                if (!isNaN(a[campo]) && !isNaN(b[campo])) {
                    A = Number(a[campo]);
                    B = Number(b[campo]);
                }

                if (A < B) return dir === "asc" ? -1 : 1;
                if (A > B) return dir === "asc" ? 1 : -1;
                return 0;
            });
        }
    }

    count.textContent = `${filtrados.length} resultado(s)`;

    grid.innerHTML = "";
    filtrados.forEach(item => {

        const estado = (item.Estado || "").toString();
        const genero = item.Genero || "";
        const puntuacion = item.Puntuacion || "";
        const comentarios = item.Comentarios || "";
        const emision = item["Emision Disco"] || "";

        const fechaEmision = parseFecha(emision);
        const hoy = new Date();
        const noEmitido = fechaEmision && fechaEmision > hoy;

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">#${item.Pos} · ${item.Banda}</div>
                    <div class="card-subtitle">${item.Disco}</div>
                </div>
                <div>
                    <span class="pill pill-genero">${genero}</span>
                    <span class="pill ${claseEstado(estado)}">
                        ${estado || "---"}
                    </span>
                </div>
            </div>

            <div class="card-body">
                <strong>Emisión:</strong>
                ${
                    emision
                        ? noEmitido
                            //? `<span class="pill-emision no">No emitido</span> (${emision})`
                            //: `<span class="pill-emision">Emitido</span> (${emision})`
							? `<span class="pill-emision no">${emision}</span> `
							: `<span class="pill-emision">${emision}</span> `
                        //: "<em>Sin fecha</em>"
						: "<em>"${hoy}"</em>"
                }
                <br><br>
                ${comentarios || "<em>Sin comentarios</em>"}
            </div>

            <div class="card-footer">
                <span class="badge">Puntuación: ${puntuacion || "-"}</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

function cargarFiltros() {
    const selectGenero = document.getElementById("filterGenero");

    const generos = Array.from(
        new Set(datos.map(d => (d.Genero || "").trim()).filter(g => g !== ""))
    ).sort((a, b) => a.localeCompare(b, "es"));

    generos.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectGenero.appendChild(opt);
    });
}

// EVENTOS
document.getElementById("search").addEventListener("input", render);
document.getElementById("filterGenero").addEventListener("change", render);
document.getElementById("filterEstado").addEventListener("change", render);
document.getElementById("sortField").addEventListener("change", render);
document.getElementById("sortDir").addEventListener("change", render);

// CARGA DEL JSON
fetch("data/new_mp3h.json")
    .then(r => r.json())
    .then(data => {
        datos = Array.isArray(data) ? data : [];

        // Orden por defecto: Pos DESC
        datos.sort((a, b) => Number(b.Pos) - Number(a.Pos));

        cargarFiltros();
        render();
    })
    .catch(err => {
        document.getElementById("count").textContent = "Error cargando JSON: " + err;
    });
