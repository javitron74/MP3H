let datos = [];

function normalizar(t) {
    return (t || "").toString().toLowerCase();
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

        if (campo === "Pos") {
            filtrados.sort((a, b) => {
                const A = Number(a.Pos);
                const B = Number(b.Pos);
                return dir === "asc" ? A - B : B - A;
            });
        }

        else if (campo === "Emision Disco") {
            filtrados.sort((a, b) => {
                const A = a["Emision Disco"] ? new Date(a["Emision Disco"]) : new Date("1900-01-01");
                const B = b["Emision Disco"] ? new Date(b["Emision Disco"]) : new Date("1900-01-01");
                return dir === "asc" ? A - B : B - A;
            });
        }

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

        const fechaEmision = emision ? new Date(emision) : null;
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
                    <span class="pill pill-estado ${estado === "No" ? "no" : ""}">
                        ${estado === "Si" ? "Emitido" : "No emitido"}
                    </span>
                </div>
            </div>

            <div class="card-body">
                <strong>Emisión:</strong>
                ${
                    emision
                        ? noEmitido
                            ? `<span class="pill-emision no">No emitido</span> (${emision})`
                            : `<span class="pill-emision">Emitido</span> (${emision})`
                        : "<em>Sin fecha</em>"
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

document.getElementById("search").addEventListener("input", render);
document.getElementById("filterGenero").addEventListener("change", render);
document.getElementById("filterEstado").addEventListener("change", render);
document.getElementById("sortField").addEventListener("change", render);
document.getElementById("sortDir").addEventListener("change", render);

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