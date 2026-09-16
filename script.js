let datos = [];
const WORKER = "https://mp3h-backend.josejaviertroncoso.workers.dev";
const esFormulario = location.pathname.includes("form-edit");
const esIndex = !esFormulario;

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
//Resetear worker con JSON de github
function resetWorker(){
	fetch("https://mp3h-backend.josejaviertroncoso.workers.dev/import",{method:"POST"});
}

// Cargar datos desde Cloudflare KV
async function cargarDatos() {
    try {
        const res = await fetch(WORKER + "/mp3h.json");
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
		
		const registroNuevo = {
			Pos: Pos,
			Banda: Banda,
			Disco: Disco,
			Genero: Genero,
			"Emision Disco": Emision,
			Estado: Estado.trim() !== "" ? Estado : "---",
			Comentarios: Comentarios,
			Puntuacion: Puntuacion
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
		alert("Registro actualizado");
		location.href = "index.html"; 
	}
	//eventos del formulario
	document.getElementById("btnGuardar").onclick = guardar;
	document.getElementById("btnGuardarMobile").onclick = guardar;
	
	Puntuacion.addEventListener("input", e => {
        actualizarValorPuntuacion(e.target.value);
    });
	
	cargar();
	
}
function render() {
    const grid = document.getElementById("grid");
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
	/*document.getElementById("search").addEventListener("input", render);
	document.getElementById("filterGenero").addEventListener("change", render);
	document.getElementById("filterEstado").addEventListener("change", render);
	document.getElementById("sortField").addEventListener("change", render);
	document.getElementById("sortDir").addEventListener("change", render);
	document.getElementById("btnReset").onclick = async () => {
		if (!confirm("¿Seguro que quieres reimportar el JSON desde GitHub?\nEsto sobrescribirá todos los datos del KV.")) {
			return;
		}

		try {
			const res = await fetch(WORKER + "/import", {
				method: "POST"
			});

			const txt = await res.text();
			alert("KV reseteado:\n" + txt);

			// Recargar la página para ver los datos nuevos
			cargarDatos();
		} catch (err) {
			alert("Error al importar JSON: " + err);
		}
	};
	*/
function iniciarEventosIndex() {
    const search = document.getElementById("search");
    const filterGenero = document.getElementById("filterGenero");
    const filterEstado = document.getElementById("filterEstado");
    const sortField = document.getElementById("sortField");
    const sortDir = document.getElementById("sortDir");
    const btnReset = document.getElementById("btnReset");

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
                alert("KV reseteado:\n" + txt);

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
}

if (esFormulario) {
    iniciarFormulario();
}
