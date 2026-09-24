// =====================
// MP3H – Script escalable
// Motor genérico para múltiples páginas
// =====================

let datos = [];
//let modoVista = "cards"; // cards | table

const WORKER = "https://mp3h-backend.josejaviertroncoso.workers.dev";
const CFG = window.MP3H_CONFIG || {
    tipo: "discos",
    json: "get?dataset=mp3h",
    update: "update?dataset=mp3h",
    formulario: "form-edit.html",
    apiKey: "",
	defaultModoVista: "card",
    campos: [
        "Pos","Banda","Disco","Genero",
        "Emision Disco","Estado","Comentarios",
        "Puntuacion","Fuente Puntuacion"
    ]
};
let modoVista = CFG.defaultModoVista // cards | table
// =====================
// Utilidades
// =====================

function normalizar(t) {
    return (t || "").toString().toLowerCase();
}

function parsePuntuacion(value) {
    if (!value || value === "-") return null;
    const normalizado = value.replace(",", ".");
    const numero = Number(normalizado);
    return isNaN(numero) ? null : numero;
}

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

function clasePuntuacion(p) {
    if (p === null) return "score-none";
    if (p >= 8) return "score-high";
    if (p >= 6) return "score-mid";
    return "score-low";
}

function mostrarMensaje(texto, tipo = "info") {
    let msg = document.getElementById("mp3h-msg");
    if (!msg) {
        msg = document.createElement("div");
        msg.id = "mp3h-msg";
        msg.className = "mp3h-msg";
        document.body.appendChild(msg);
    }

    const iconos = { info: "ℹ️", ok: "✔️", warn: "⚠️", error: "❌" };
    msg.className = "mp3h-msg " + tipo;
    msg.textContent = iconos[tipo] + " " + texto;
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 3000);
}

// =====================
// Carga de datos
// =====================

async function cargarDatos() {
    try {
        const res = await fetch(WORKER + "/" + CFG.json, {
            headers: { "X-API-Key": CFG.apiKey || "" }
        });
        const data = await res.json();

        datos = Array.isArray(data) ? data : [];
        datos.sort((a, b) => Number(b.Pos) - Number(a.Pos));

        cargarFiltrosGenericos();
        render();
    } catch (err) {
        const count = document.getElementById("count");
        if (count) count.textContent = "Error cargando JSON: " + err;
    }
}

// =====================
// Filtros genéricos
// =====================

let estadosSeleccionados = ["---", "Pre-ok", "Ok"];

function cargarFiltrosGenericos() {
    const selectGenero = document.getElementById("filterGenero");
    if (!selectGenero) return;

    const generos = Array.from(
        new Set(
            datos
                .map(d => d.Genero || "")
                .flatMap(g =>
                    g
                        .split(",")
                        .map(x => normalizar(x.trim()))
                        .filter(x => x !== "")
                )
        )
    ).sort((a, b) => a.localeCompare(b, "es"));

    generos.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectGenero.appendChild(opt);
    });

    // multifiltro estado
    const estadoPills = document.querySelectorAll("#filterEstado .pill");
    estadoPills.forEach(pill => {
        const value = pill.dataset.value;
        if (estadosSeleccionados.includes(value)) {
            pill.classList.add("selected");
        }
        pill.addEventListener("click", () => {
            if (estadosSeleccionados.includes(value)) {
                estadosSeleccionados = estadosSeleccionados.filter(v => v !== value);
                pill.classList.remove("selected");
            } else {
                estadosSeleccionados.push(value);
                pill.classList.add("selected");
            }
            render();
        });
    });
}

// =====================
// Render genérico
// =====================

const grid = document.getElementById("grid");

function filtrarGenerico() {
    const q = normalizar(document.getElementById("search")?.value || "");
    const g = document.getElementById("filterGenero")?.value || "";
    const campoGenero = "Genero";

    return datos.filter(item => {
        const textoCoincide =
            !q ||
            CFG.campos.some(c =>
                normalizar(item[c] || "").includes(q)
            );

        const genero = normalizar(item[campoGenero] || "");
        const coincideGenero =
            !g ||
            genero
                .split(",")
                .map(x => x.trim())
                .includes(normalizar(g));

        const estado = (item.Estado && item.Estado.trim() !== "") ? item.Estado : "---";
        const coincideEstado =
            estadosSeleccionados.length === 0 ||
            estadosSeleccionados.includes(estado);

        return textoCoincide && coincideGenero && coincideEstado;
    });
}

function ordenarGenerico(filtrados) {
    const campo = document.getElementById("sortField")?.value || "";
    const dir = document.getElementById("sortDir")?.value || "asc";

    if (!campo) return filtrados;
    if (!CFG.campos.includes(campo)) return filtrados;

    if (campo === "Pos") {
        return filtrados.sort((a, b) => {
            const A = Number(a.Pos);
            const B = Number(b.Pos);
            return dir === "asc" ? A - B : B - A;
        });
    }

    return filtrados.sort((a, b) => {
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

// =====================
// Renderizadores por tipo
// =====================

function generarTarjetasDiscos(filtrados) {
    grid.innerHTML = "";
    filtrados.forEach(item => {
        const estado = (item.Estado || "").toString();
        const genero = item.Genero || "";
        const puntuacion = parsePuntuacion(item.Puntuacion);
        const comentarios = item.Comentarios || "";
        const emision = item["Emision Disco"] || "";
        const fuente = item["Fuente Puntuacion"] || "";

        let fechaEmisionFormato = "<em>Sin fecha</em>";
        let noEmitido = false;

        if (emision) {
            const [anio, mes, dia] = emision.split("-");
            const fechaEmision = new Date(anio, mes - 1, dia);
            fechaEmisionFormato = fechaEmision.toLocaleDateString(
                "es-ES",
                { day: "2-digit", month: "2-digit", year: "numeric" }
            );
            const hoy = new Date();
            const fechaHoy = new Date(
                `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
            );
            noEmitido = fechaEmision && fechaEmision > fechaHoy;
        }

        const card = document.createElement("div");
        card.className = "card";

        const clase = claseEstado(estado);
        if (clase) card.classList.add(clase.replace("pill-", ""));

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">#${item.Pos} · ${item.Banda}</div>
                    <div class="card-subtitle">${item.Disco || ""}</div>
                </div>
                <div class="edit-btn" onclick="location.href='${CFG.formulario}?pos=${item.Pos}'">
                    <svg viewBox="0 0 24 24" class="edit-icon">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                    </svg>
                </div>
                <div class="delete-btn" onclick="eliminar('${item.Pos}')">
                    <svg viewBox="0 0 24 24" class="delete-icon">
                        <path d="M6 7h12l-1 12H7L6 7zm5-3h2l1 1h5v2H4V5h5l1-1z"/>
                    </svg>
                </div>
                <div>
                    <span class="pill pill-genero">${genero}</span>
                </div>
            </div>
            <div class="card-body">
                ${
                    emision
                        ? noEmitido
                            ? `<span class="pill-emision no">${fechaEmisionFormato}</span>`
                            : `<span class="pill-emision">${fechaEmisionFormato}</span>`
                        : "<em>Sin fecha</em>"
                }
                <span class="pill ${claseEstado(estado)}">
                    ${estado || "---"}
                </span>
                <br><br>
                <span class="card-body-comment">${comentarios}</span>
            </div>
            <div class="card-footer">
                <span class="score ${clasePuntuacion(puntuacion)}">
                    ${puntuacion !== null ? puntuacion : "-"}
                </span>
                <span class="score-source">
                    ${fuente !== "" ? `(${fuente})` : ""}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function generarTarjetasNuevos(filtrados) {
    grid.innerHTML = "";
    filtrados.forEach(item => {
        const estado = item.Estado || "---";
        const genero = item.Genero || "";
        const comentarios = item.Comentarios || "";

        const card = document.createElement("div");
        card.className = "card";

        const clase = claseEstado(estado);
        if (clase) card.classList.add(clase.replace("pill-", ""));

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">#${item.Pos} · ${item.Banda}</div>
                <span class="pill pill-genero">${genero}</span>
            </div>
            <div class="card-body">
                <span class="pill ${claseEstado(estado)}">
                    ${estado}
                </span>
                <br><br>
                <span class="card-body-comment">${comentarios}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

const RENDERERS = {
    discos: generarTarjetasDiscos,
    nuevos: generarTarjetasNuevos
    // futuro: artistas, etc.
};

// =====================
// Render principal
// =====================

function render() {
    const count = document.getElementById("count");
    let filtrados = filtrarGenerico();
    filtrados = ordenarGenerico(filtrados);

    if (count) count.textContent = `${filtrados.length} resultado(s)`;

    const renderer = RENDERERS[CFG.tipo] || generarTarjetasDiscos;
    renderer(filtrados);
}

// =====================
// Eventos
// =====================

function iniciarEventosIndex() {
    const search = document.getElementById("search");
    const filterGenero = document.getElementById("filterGenero");
    const sortField = document.getElementById("sortField");
    const sortDir = document.getElementById("sortDir");
    const btnReset = document.getElementById("btnReset");
    const toggleVista = document.getElementById("toggleVista");

    if (toggleVista) {
        toggleVista.addEventListener("click", () => {
            modoVista = modoVista === "cards" ? "table" : "cards";
            render();
        });
    }

    if (search) search.addEventListener("input", render);
    if (filterGenero) filterGenero.addEventListener("change", render);
    if (sortField) sortField.addEventListener("change", render);
    if (sortDir) sortDir.addEventListener("change", render);

    if (btnReset && CFG.tipo === "discos") {
        btnReset.onclick = async () => {
            if (!confirm("¿Seguro que quieres reimportar el JSON desde GitHub?\nEsto sobrescribirá todos los datos del KV.")) {
                return;
            }
            try {
                const res = await fetch(WORKER + "/import", { method: "POST" });
                const txt = await res.text();
                mostrarMensaje("KV reseteado:\n" + txt);
                cargarDatos();
            } catch (err) {
                alert("Error al importar JSON: " + err);
            }
        };
    }
}

// =====================
// Eliminar genérico
// =====================

async function eliminar(pos) {
    if (!confirm("¿Seguro que quieres eliminar este registro?")) return;

    const nuevos = datos.filter(d => d.Pos != pos);

    await fetch(WORKER + CFG.update, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevos)
    });

    datos = nuevos;
    render();
}

// ===============================
//  FORMULARIO ESCALABLE
// ===============================
async function iniciarFormulario() {
    const params = new URLSearchParams(location.search);
    const pos = params.get("pos");

    const dataset = MP3H_FORM.dataset;
    const campos = MP3H_FORM.campos;

    // 1. Cargar datos del dataset
    const res = await fetch(WORKER + "/get?dataset=" + dataset, {
        headers: { "X-API-Key": CFG.apiKey }
    });

    datos = await res.json();

    let modo = pos ? "edit" : "add";
    let idx = -1;

    // ===============================
    //  SLIDER DE PUNTUACIÓN (si existe)
    // ===============================
    const slider = document.getElementById("puntuacion");
    const sliderEnabled = document.getElementById("puntuacionEnabled");
    const sliderValue = document.getElementById("rangeValue");
    const fuenteInput = document.getElementById("Fuente Puntuacion");

    function actualizarEstadoPuntuacion() {
        if (!slider || !sliderEnabled || !fuenteInput) return;

        const enabled = sliderEnabled.checked;

        slider.disabled = !enabled;
        fuenteInput.disabled = !enabled;

        sliderValue.textContent = enabled ? slider.value : "";
    }

    function actualizarValorPuntuacion(v) {
        if (sliderValue) sliderValue.textContent = v;
    }

    if (slider && sliderEnabled) {
        slider.addEventListener("input", () => actualizarValorPuntuacion(slider.value));
        sliderEnabled.addEventListener("change", actualizarEstadoPuntuacion);
    }

    // ===============================
    //  MODO EDICIÓN
    // ===============================
    if (modo === "edit") {
        idx = datos.findIndex(r => String(r.Pos) === String(pos));

        if (idx < 0) {
            alert("No se encontró el registro con Pos=" + pos);
            return;
        }

        const registro = datos[idx];

        // Rellenar campos dinámicamente
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) input.value = registro[campo] || "";
        });

        // Slider si existe
        if (slider && sliderEnabled) {
            const tienePuntuacion = registro.Puntuacion && registro.Puntuacion !== "";

            sliderEnabled.checked = tienePuntuacion;
            slider.value = tienePuntuacion ? registro.Puntuacion : 0;
            fuenteInput.value = tienePuntuacion ? (registro["Fuente Puntuacion"] || "") : "";

            actualizarValorPuntuacion(tienePuntuacion ? registro.Puntuacion : "");
            actualizarEstadoPuntuacion();
        }

    } else {
        // ===============================
        //  MODO AÑADIR
        // ===============================
        const posiciones = datos.map(r => Number(r.Pos)).filter(n => !isNaN(n));
        let nextPos = posiciones.length ? Math.max(...posiciones) + 1 : 1;
        while (posiciones.includes(nextPos)) nextPos++;

        const posInput = document.getElementById("Pos");
        if (posInput) posInput.value = nextPos;

        // Inicializar campos
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            if (!input) return;

            if (campo === "Estado") input.value = "---";
            else input.value = "";
        });

        // Slider si existe
        if (slider && sliderEnabled) {
            sliderEnabled.checked = false;
            slider.value = 0;
            actualizarValorPuntuacion(0);

            if (fuenteInput) fuenteInput.value = "";
            actualizarEstadoPuntuacion();
        }
    }

    // ===============================
    //  GUARDAR REGISTRO
    // ===============================
    async function guardar() {
        const nuevo = {};

        // Leer todos los campos dinámicamente
        campos.forEach(campo => {
            const input = document.getElementById(campo);
            nuevo[campo] = input ? input.value : "";
        });

        // Manejo especial de puntuación si existe
        if (slider && sliderEnabled) {
            nuevo.Puntuacion = sliderEnabled.checked ? slider.value : "";
            nuevo["Fuente Puntuacion"] = sliderEnabled.checked ? fuenteInput.value : "";
        }

        // Validar Pos
        const nuevoPos = Number(nuevo.Pos);
        if (isNaN(nuevoPos) || nuevoPos <= 0) {
            alert("Pos debe ser un número válido");
            return;
        }

        // Comprobar duplicados
        const existe = datos.some((r, i) =>
            Number(r.Pos) === nuevoPos && i !== idx
        );

        if (existe) {
            alert("El valor de Pos ya existe");
            return;
        }

        // Insertar o actualizar
        if (modo === "edit") datos[idx] = nuevo;
        else datos.push(nuevo);

        // Guardar en KV
        await fetch(WORKER + "/update?dataset=" + dataset, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": CFG.apiKey
            },
            body: JSON.stringify(datos)
        });

        mostrarMensaje("Registro guardado", "ok");

        setTimeout(() => {
            location.href = "index.html";
        }, 800);
    }

    // Eventos del formulario
    const btnGuardar = document.getElementById("btnGuardar");
    const btnGuardarMobile = document.getElementById("btnGuardarMobile");

    if (btnGuardar) btnGuardar.onclick = guardar;
    if (btnGuardarMobile) btnGuardarMobile.onclick = guardar;
}


// =====================
// Inicio
// =====================

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();
    iniciarEventosIndex();
});
