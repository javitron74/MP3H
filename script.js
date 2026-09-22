let datos = [];
let modoVista = "cards"; // cards | table

const WORKER = "https://mp3h-backend.josejaviertroncoso.workers.dev";
const esFormulario = location.pathname.includes("form-edit");
const esIndex = !esFormulario;
const API_KEY = "a92f6f0d-7f88-4681-a2de-2722e6a20410";

if (esIndex && !window.location.search.includes('v=')) {
    const nuevaURL = window.location.pathname + '?v=' + Date.now();
    window.location.replace(nuevaURL);
}

// Crear el espacio para mensajes
if (!document.getElementById("mp3h-msg")) {
    const div = document.createElement("div");
    div.id = "mp3h-msg";
    div.className = "mp3h-msg";
    document.body.appendChild(div);
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
//Para que empiecen en la hora 0
function normalizarfecha(fecha) {
	if (!(fecha instanceof Date)) return null;
    fecha.setHours(0, 0, 0, 0);
    return fecha;
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
// Clase CSS según puntuacion
function clasePuntuacion(p) {
    if (p === null) return "score-none";   // sin puntuación
    if (p >= 8) return "score-high";       // 8.0 – 10.0
    if (p >= 6) return "score-mid";        // 6.0 – 7.99
    return "score-low";                    // 0 – 5.99
}

function parsePuntuacion(value) {
    if (!value || value === "-") return null;

    // Convertir coma decimal a punto
    const normalizado = value.replace(",", ".");
    const numero = Number(normalizado);

    return isNaN(numero) ? null : numero;
}
//Mensaje toast
function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
//Mensaje en el div dinamico
function mostrarMensaje(texto, tipo = "info") {
    const msg = document.getElementById("mp3h-msg");

    msg.className = "mp3h-msg " + tipo;

    // Iconos según tipo
    const iconos = {
        info: "ℹ️",
        ok: "✔️",
        warn: "⚠️",
        error: "❌"
    };

    msg.textContent = iconos[tipo] + " " + texto;

    msg.classList.add("show");

    setTimeout(() => {
        msg.classList.remove("show");
    }, 3000);
}

//Resetear worker con JSON de github
function resetWorker(){
	fetch("https://mp3h-backend.josejaviertroncoso.workers.dev/import",{method:"POST"});
}

// Cargar datos desde Cloudflare KV
async function cargarDatos() {
    try {
        const res = await fetch(WORKER + "/mp3h.json",{
			headers: {
				"X-API-Key": "TU_TOKEN_SECRETO"
			}
		});
        const data = await res.json();

        datos = Array.isArray(data) ? data : [];

        // Ordenar por Pos numérico
        datos.sort((a, b) => Number(b.Pos) - Number(a.Pos));
        cargarFiltros();
        render();
    } catch (err) {
        document.getElementById("count").textContent =
            "Error cargando JSON: " + err;
    }
}

const grid = document.getElementById("grid");

function generarTarjetas(filtrados) {
    grid.innerHTML = "";
	filtrados.forEach(item => {

        const estado = (item.Estado || "").toString();
        const genero = item.Genero || "";
		const puntuacion = parsePuntuacion(item.Puntuacion);
        const comentarios = item.Comentarios || "";
        const emision = item["Emision Disco"] || "";
		const fuente = item["Fuente Puntuacion"] || "";
		
		const [anio, mes, dia]=emision.split('-');
		const fechaEmision = new Date(anio, mes - 1, dia);
		const fechaEmisionFormato = fechaEmision.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hoy = new Date();
		const fechaHoy = new Date(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`);
        const noEmitido = fechaEmision && fechaEmision > fechaHoy;


        const card = document.createElement("div");
        card.className = "card";

		// Añadir clase de borde según estado
		const clase = claseEstado(estado); // devuelve pill-estado-ok, pill-estado-no, etc.
		if (clase) {
			card.classList.add(clase.replace("pill-", "")); 
		}
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">#${item.Pos} · ${item.Banda}</div>
                    <div class="card-subtitle">${item.Disco}</div>
                </div>
				<!-- ICONO EDITAR -->
				<div class="edit-btn" onclick="location.href='form-edit.html?pos=${item.Pos}'">
					<svg viewBox="0 0 24 24" class="edit-icon">
						<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
					</svg>
				</div>
				<!-- ICONO ELIMINAR -->
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
                            //? `<span class="pill-emision no">No emitido</span> (${emision})`
                            //: `<span class="pill-emision">Emitido</span> (${emision})`
							? `<span class="pill-emision no">${fechaEmisionFormato}</span> `
							: `<span class="pill-emision">${fechaEmisionFormato}</span> `
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
					${fuente !== "" ? `(${fuente})`: ""}
				</span>
            </div>
        `;

        grid.appendChild(card);
    });
}

function generarTabla(filtrados) {
    let html = `
    <table class="tabla-mp3h">
        <thead>
            <tr>
                <th>#</th>
                <th>Banda</th>
                <th>Disco</th>
                <th>Género</th>
                <th>Estado</th>
                <th>Emisión</th>
                <th>Punt</th>
                <th></th>
                <th>Comentarios</th>
				<th></th>
            </tr>
        </thead>
        <tbody>
    `;

    filtrados.forEach(item => {
        const estado = (item.Estado || "").toString();
        const genero = item.Genero || "";
		const puntuacion = parsePuntuacion(item.Puntuacion);
        const comentarios = item.Comentarios || "";
        const emision = item["Emision Disco"] || "";
		const fuente = item["Fuente Puntuacion"] || "";
		
		const [anio, mes, dia]=emision.split('-');
		const fechaEmision = new Date(anio, mes - 1, dia);
		const fechaEmisionFormato = fechaEmision.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hoy = new Date();
		const fechaHoy = new Date(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`);
        const noEmitido = fechaEmision && fechaEmision > fechaHoy;

        html += `
        <tr class="${claseEstado(estado).replace("pill-", "")}">
            <td>${item.Pos}</td>
            <td>${item.Banda}</td>
            <td>${item.Disco}</td>
            <td>${item.Genero || "-"}</td>
            <td><span class="pill ${claseEstado(estado)}">
					${estado || "---"}
				</span></td>
            <td>
				<span class="pill-emision">
					${
						emision
							? noEmitido
								? `<span class="pill-emision no">${fechaEmisionFormato}</span> `
								: `<span class="pill-emision">${fechaEmisionFormato}</span> `
							: "<em>Sin fecha</em>"
					}
				</span>
			</td>
            <td><span class="score score-high">${puntuacion !== null ? puntuacion : "-"}</span></td>
            <td><span class="score-source">${fuente}</span></td>
            <td><span class="card-body-comment">${item.Comentarios || ""}</span></td>
            <td>
				<div class="acciones">
					<!-- Editar -->
					<div onclick="location.href='form-edit.html?pos=${item.Pos}'">
						<svg viewBox="0 0 24 24">
							<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
						</svg>
					</div>
					<!-- Eliminar -->
					<div onclick="eliminar('${item.Pos}')">
						<svg viewBox="0 0 24 24">
							<path d="M6 7h12l-1 12H7L6 7zm5-3h2l1 1h5v2H4V5h5l1-1z"/>
						</svg>
					</div>
				</div>
            </td>			
        </tr>`;
    });

    html += "</tbody></table>";

    grid.innerHTML = html;
}


function iniciarFormulario(){
	const params = new URLSearchParams(location.search);
    const pos = params.get("pos");
	let idx = null;
	let modo = pos ? "edit" : "add";


	function actualizarValorPuntuacion(v) {
		document.getElementById("rangeValue").textContent = v;
	}
	
	const slider = document.getElementById("puntuacion");

	if (slider) {
		slider.addEventListener("input", () => {
			actualizarValorPuntuacion(slider.value);
		});
	}
	function cancelar(){
		location.href = "index.html";
	}

	async function cargar() {
		const params = new URLSearchParams(location.search);
		const pos = params.get("pos");

		const res = await fetch(WORKER + "/mp3h.json");
		datos = await res.json();
		
		if (pos) {
			// MODO EDICION
			modo = "edit";
			formTitle.textContent = "Editar MP3H";
			
			//const registro = datos.find(d => String(d.Pos).trim() === String(pos).trim());
			idx = datos.findIndex(d => String(d.Pos).trim() === String(pos).trim());

			if (idx < 0) {
				alert("Error: No se encontró el registro con Pos=" + pos);
				console.log("Pos recibido:", pos);
				console.log("Pos en datos:", datos.map(d => d.Pos));
				return;
			}

			const registro = datos[idx];

			Pos.value = registro.Pos || "";
			banda.value = registro.Banda || "";
			disco.value = registro.Disco || "";
			genero.value = registro.Genero || "";
			emision.value = registro["Emision Disco"] || "";
			estado.value = registro.Estado && registro.Estado.trim() !== "" ? registro.Estado : "---";
			comentarios.value = registro.Comentarios || "";
			puntuacion.value = registro.Puntuacion || 0;
			fuentePuntuacion.value = registro["Fuente Puntuacion"] || "";
			actualizarValorPuntuacion(registro.Puntuacion || 0);
		} else {
		// MODO AÑADIR
			modo = "add";
			formTitle.textContent = "Añadir MP3H";
			
			const posicionesValidas = datos
				.map(d => Number(String(d.Pos).trim()))
				.filter(n => !isNaN(n));
			
			const nextPos = datos.length > 0
				? Math.max(...posicionesValidas) + 1
				: 1;
			while (posicionesValidas.includes(nextPos)) {
				nextPos++;
			}
			
			document.getElementById("Pos").value = nextPos;
			document.getElementById("estado").value = "---";
			document.getElementById("puntuacion").value = 0;
			actualizarValorPuntuacion(0);
		}					
	}

	async function guardar() {
		const Pos = document.getElementById("Pos").value;
		const Banda = document.getElementById("banda").value;
		const Disco = document.getElementById("disco").value;
		const Genero = document.getElementById("genero").value;
		const Emision = document.getElementById("emision").value;
		const Estado = document.getElementById("estado").value;
		const Comentarios = document.getElementById("comentarios").value;
		const Puntuacion = document.getElementById("puntuacion").value;
		const FuentePuntuacion = document.getElementById("fuentePuntuacion").value;

		const nuevoPos = Number(Pos);

		// Validar Pos
		if (isNaN(nuevoPos) || nuevoPos <= 0) {
			alert("El valor de Pos debe ser un número válido mayor que 0.");
			return;
		}

		// Comprobar duplicados
		const existe = datos.some((d, i) =>
			Number(d.Pos) === nuevoPos && i !== idx
		);

		if (existe) {
			alert("El valor de Pos ya existe. Elige otro número.");
			return;
		}

		const registroNuevo = {
			Pos: Pos,
			Banda: Banda,
			Disco: Disco,
			Genero: Genero,
			"Emision Disco": Emision,
			Estado: Estado.trim() !== "" ? Estado : "---",
			Comentarios: Comentarios,
			Puntuacion: Puntuacion,
			"Fuente Puntuacion": FuentePuntuacion
		  };
		
		if(modo === "edit") {
		
			if (idx === null || idx < 0) {
				alert("Error: idx no está definido");
				return;
			  }
			datos[idx] = registroNuevo;
		} else {
			datos.push(registroNuevo);
		}

		await fetch(WORKER + "/update", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(datos)
		});
		//alert("Registro actualizado");
		mostrarMensaje("Registro actualizado");
		setTimeout(() => {
			location.href = "index.html";
		}, 800);
	}
	//eventos del formulario
	document.getElementById("btnGuardar").onclick = guardar;
	document.getElementById("btnGuardarMobile").onclick = guardar;
	
/*	Puntuacion.addEventListener("input", e => {
        actualizarValorPuntuacion(e.target.value);
    });
*/
	cargar();
	
}

function render() {
    //const grid = document.getElementById("grid");
    const count = document.getElementById("count");

    const q = normalizar(document.getElementById("search").value);
    const g = document.getElementById("filterGenero").value;
    //const e = document.getElementById("filterEstado").value;

    let filtrados = datos.filter(item => {
        const banda = normalizar(item.Banda);
        const disco = normalizar(item.Disco);
        const genero = normalizar(item.Genero);
        const comentarios = normalizar(item.Comentarios);
        //const estado = (item.Estado || "").trim();
		const estado = (item.Estado && item.Estado.trim() !=="")
			? item.Estado
			: "---";

        const coincideTexto =
            !q ||
            banda.includes(q) ||
            disco.includes(q) ||
            genero.includes(q) ||
            comentarios.includes(q);

        //const coincideGenero = !g || genero === normalizar(g);
		const coincideGenero = !g || 
			genero
				.split(",")
				.map(x => normalizar(x).trim())
				.includes(normalizar(g));
        //const coincideEstado = !e || estado === e;
		
		//MULTIFILTRO Estado 7/08/2026, eliminado la e
		const coincideEstado =
			estadosSeleccionados.length === 0 ||
			estadosSeleccionados.includes(estado);
			
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
                //const A = parseFecha(a["Emision Disco"]);
                //const B = parseFecha(b["Emision Disco"]);
                //return dir === "asc" ? A - B : B - A;
				const A = a["Emision Disco"] || "";
				const B = b["Emision Disco"] || "";

				return dir === "asc"
					? A.localeCompare(B)
					: B.localeCompare (A);
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
	
	if (modoVista === "cards") {
        generarTarjetas(filtrados);
    } else {
        generarTabla(filtrados);
    }
/*	
    filtrados.forEach(item => {

        const estado = (item.Estado || "").toString();
        const genero = item.Genero || "";
        //const puntuacion = item.Puntuacion || "";
		const puntuacion = parsePuntuacion(item.Puntuacion);
        const comentarios = item.Comentarios || "";
        const emision = item["Emision Disco"] || "";
		const fuente = item["Fuente Puntuacion"] || "";
		
		const [anio, mes, dia]=emision.split('-');
		const fechaEmision = new Date(anio, mes - 1, dia);
		const fechaEmisionFormato = fechaEmision.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
        const hoy = new Date();
		const fechaHoy = new Date(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`);
        const noEmitido = fechaEmision && fechaEmision > fechaHoy;


        const card = document.createElement("div");
        card.className = "card";

		// Añadir clase de borde según estado
		const clase = claseEstado(estado); // devuelve pill-estado-ok, pill-estado-no, etc.
		if (clase) {
			card.classList.add(clase.replace("pill-", "")); 
		}
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">#${item.Pos} · ${item.Banda}</div>
                    <div class="card-subtitle">${item.Disco}</div>
                </div>
				<!-- ICONO EDITAR -->
				<div class="edit-btn" onclick="location.href='form-edit.html?pos=${item.Pos}'">
					<svg viewBox="0 0 24 24" class="edit-icon">
						<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
					</svg>
				</div>
				<!-- ICONO ELIMINAR -->
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
                            //? `<span class="pill-emision no">No emitido</span> (${emision})`
                            //: `<span class="pill-emision">Emitido</span> (${emision})`
							? `<span class="pill-emision no">${fechaEmisionFormato}</span> `
							: `<span class="pill-emision">${fechaEmisionFormato}</span> `
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
					${fuente !== "" ? `(${fuente})`: ""}
				</span>
            </div>
        `;

        grid.appendChild(card);
    });
*/
}

function cargarFiltros() {
    const selectGenero = document.getElementById("filterGenero");

    const generos = Array.from(
        new Set(
			datos
				.flatMap(d => 
					normalizar(d.Genero || "")
						.split(",")
						.map(g => g.trim())
						.filter(g => g !== "")
				)
		)
    ).sort((a, b) => a.localeCompare(b, "es"));

    generos.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        selectGenero.appendChild(opt);
    });
}

// MULTIFILTRO Estado 7/08/2026
// --- MULTISELECT ESTADO ---
document.addEventListener("DOMContentLoaded", () => {

    const estadoPills = document.querySelectorAll("#filterEstado .pill");
    window.estadosSeleccionados = ["---", "Pre-ok", "Ok"]; // global

    estadoPills.forEach(pill => {
		const value = pill.dataset.value;

        // Marcar visualmente los que están preseleccionados
        if (estadosSeleccionados.includes(value)) {
            pill.classList.add("selected");
        }
		
		// Eventos de clic
        pill.addEventListener("click", () => {
            //const value = pill.dataset.value;

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

});

// INICIAR EVENTOS INDEX
function iniciarEventosIndex() {
    const search = document.getElementById("search");
    const filterGenero = document.getElementById("filterGenero");
    const filterEstado = document.getElementById("filterEstado");
    const sortField = document.getElementById("sortField");
    const sortDir = document.getElementById("sortDir");
    const btnReset = document.getElementById("btnReset");
	
	document.getElementById("toggleVista").addEventListener("click", () => {
		modoVista = (modoVista === "cards") ? "table" : "cards";
		render();
	});

    if (search) search.addEventListener("input", render);
    if (filterGenero) filterGenero.addEventListener("change", render);
    if (filterEstado) filterEstado.addEventListener("change", render);
    if (sortField) sortField.addEventListener("change", render);
    if (sortDir) sortDir.addEventListener("change", render);

    if (btnReset) {
        btnReset.onclick = async () => {
            if (!confirm("¿Seguro que quieres reimportar el JSON desde GitHub?\nEsto sobrescribirá todos los datos del KV.")) {
                return;
            }

            try {
                const res = await fetch(WORKER + "/import", { method: "POST" });
                const txt = await res.text();
                mostrarMensaje("KV reseteado:\n" + txt);

                cargarDatos(); // solo en index
            } catch (err) {
                alert("Error al importar JSON: " + err);
            }
        };
    }
}


/*
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
*/
//INICIAR DESDE KV
if (esIndex) {
    cargarDatos();
	iniciarEventosIndex();
}

if (esFormulario) {
    iniciarFormulario();
}

// =====================
// 🔥 Función ELIMINAR
// =====================
async function eliminar(pos) {
    if (!confirm("¿Seguro que quieres eliminar este disco?")) return;

    // Filtrar el disco fuera del array
    const nuevos = datos.filter(d => d.Pos != pos);

    // Guardar en el Worker
    await fetch(WORKER + "/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevos)
    });

    // Actualizar la variable global
    datos = nuevos;

    // Re-render sin recargar JSON
    render();
}


// Last.fm 17/09/2026 token:5f6b01cc979afc6c4a645038fdd3986b