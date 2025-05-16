let peer;
let conn;
let jugador = {};
let enemigo = {};

let ataquePropio = null;
let ataqueOponente = null;
let listoPropio = false;
let listoOponente = false;

let vidaJugador = 0;
let vidaRival = 0;

function crearPeerPersonalizado() {
  const customId = document.getElementById('custom-id').value.trim();
  if (!customId) {
    alert("Ingresá un ID personalizado");
    return;
  }
  peer = new Peer(customId);

  const botonEstablecer = document.querySelector("button[onclick='crearPeerPersonalizado()']");
  botonEstablecer.disabled = true;
  document.getElementById('custom-id').disabled = true;

  peer.on('open', id => {
    document.getElementById('conexion-estado').textContent = `ID establecido correctamente: ${id}`;
  });

  peer.on('error', err => {
    alert('Error con PeerJS: ' + err);
    botonEstablecer.disabled = false;
    document.getElementById('custom-id').disabled = false;
    document.getElementById('conexion-estado').textContent = '';
  });

  peer.on('connection', connection => {
    conn = connection;
    establecerConexion();
  });
}

function conectar() {
  const remoteId = document.getElementById('remote-id').value.trim();
  if (!remoteId) {
    alert("Por favor ingresa el ID del oponente");
    return;
  }
  if (!peer || peer.disconnected) {
    alert("Primero establece tu ID personalizado");
    return;
  }
  conn = peer.connect(remoteId);
  establecerConexion();
}

function establecerConexion() {
  conn.on('open', () => {
    // Mostrar sección para elegir personaje y ocultar botones de conectar
    document.getElementById('seleccion-personaje').style.display = 'block';
    document.querySelector("button[onclick='conectar()']").disabled = true;
    document.getElementById('remote-id').disabled = true;
    log("Conectado. Por favor selecciona tu personaje y nombre.");
  });

  conn.on('data', data => {
    if (data.type === "inicio") {
      enemigo = data.datos;
      vidaRival = enemigo.vida;
      actualizarEstado();
      log(`Oponente conectado: ${enemigo.nombre} (${enemigo.tipo})`);
    } else if (data.type === "ataque") {
      ataqueOponente = data.ataque;
      log(`Oponente preparó su ataque.`);
    } else if (data.type === "listo") {
      ataqueOponente = data.ataque;
      listoOponente = true;
      log("Oponente confirmó estar listo.");
      if (listoPropio && listoOponente && peer.id < conn.peer) {
        resolverTurno();
      }
    } else if (data.type === "vida") {
      vidaJugador = data.vidaRival;
      vidaRival = data.vidaJugador;
      actualizarEstado();
      log(`Estado sincronizado: Tu vida ${vidaJugador} - Vida rival ${vidaRival}`);
      if (vidaJugador <= 0 || vidaRival <= 0) {
        terminarJuego();
      }
    }
  });

  conn.on('close', () => {
    log("Conexión cerrada.");
    alert("La conexión se cerró.");
    location.reload();
  });
}

const presets = {
  Zac: { vida: 30, defensa: 8, dadoDanio: 6 },
  Yac: { vida: 20, defensa: 10, dadoDanio: 8 },
  Xac: { vida: 10, defensa: 12, dadoDanio: 10 }
};

function crearMonstruo(nombre, tipo) {
  const { vida, defensa, dadoDanio } = presets[tipo] || presets.Yac;
  return { nombre, tipo, vida, defensa, dadoDanio };
}

function iniciarCombate() {
  const nombre = document.getElementById('nombre').value.trim();
  const tipo = document.getElementById('tipo').value;
  if (!nombre) {
    alert("Ingresa tu nombre para continuar");
    return;
  }
  jugador = crearMonstruo(nombre, tipo);
  vidaJugador = jugador.vida;

  // Enviar datos del jugador al oponente
  conn.send({ type: "inicio", datos: jugador });

  // Ocultar selección y mostrar la interfaz de juego
  document.getElementById('seleccion-personaje').style.display = 'none';
  document.getElementById('juego').style.display = 'block';

  actualizarEstado();
  log("¡Combate iniciado! Prepará tu ataque.");
}

function tirarDado(lados) {
  return Math.floor(Math.random() * lados) + 1;
}

function enviarAtaque() {
  if (!conn || conn.open === false) {
    alert("No estás conectado.");
    return;
  }
  if (ataquePropio) {
    alert("Ya tiraste el dado, espera al oponente.");
    return;
  }
  const tiradaD20 = tirarDado(20);
  const tiradaD6 = tirarDado(jugador.dadoDanio);
  ataquePropio = { tiradaD20, tiradaD6 };
  conn.send({ type: "ataque", ataque: ataquePropio });
  log(`Preparaste tu ataque: D20=${tiradaD20}, D${jugador.dadoDanio}=${tiradaD6}`);
}

function confirmarListo() {
  if (!ataquePropio) {
    alert("Primero tirá el dado para atacar.");
    return;
  }
  if (listoPropio) {
    alert("Ya confirmaste estar listo.");
    return;
  }
  listoPropio = true;
  conn.send({ type: "listo", ataque: ataquePropio });
  log("Confirmaste estar listo.");
  if (listoOponente && peer.id < conn.peer) {
    resolverTurno();
  }
}

function resolverTurno() {
  const iniciativaJugador = ataquePropio.tiradaD20;
  const iniciativaOponente = ataqueOponente.tiradaD20;

  let danioAlRival = 0;
  let danioRecibido = 0;

  if (iniciativaJugador >= iniciativaOponente) {
    if (iniciativaJugador >= 10) danioAlRival = ataquePropio.tiradaD6;
    vidaRival = Math.max(0, vidaRival - danioAlRival);
    if (vidaRival > 0 && iniciativaOponente >= 10) danioRecibido = ataqueOponente.tiradaD6;
    vidaJugador = Math.max(0, vidaJugador - danioRecibido);
  } else {
    if (iniciativaOponente >= 10) danioRecibido = ataqueOponente.tiradaD6;
    vidaJugador = Math.max(0, vidaJugador - danioRecibido);
    if (vidaJugador > 0 && iniciativaJugador >= 10) danioAlRival = ataquePropio.tiradaD6;
    vidaRival = Math.max(0, vidaRival - danioAlRival);
  }

  log(`Infligiste ${danioAlRival} de daño a ${enemigo.nombre}.`);
  log(`Recibiste ${danioRecibido} de daño de ${enemigo.nombre}.`);
  actualizarEstado();

  conn.send({
    type: "vida",
    vidaJugador: vidaJugador,
    vidaRival: vidaRival
  });

  ataquePropio = null;
  ataqueOponente = null;
  listoPropio = false;
  listoOponente = false;

  if (vidaJugador === 0 || vidaRival === 0) {
    terminarJuego();
  }
}

function actualizarEstado() {
  document.getElementById('estado').textContent =
    `${jugador.nombre} (${jugador.tipo}) - Vida: ${vidaJugador} vs ` +
    `${enemigo.nombre || '...'} (${enemigo.tipo || '?'}) - Vida: ${vidaRival}`;
}

function log(mensaje) {
  const logDiv = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = mensaje;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function terminarJuego() {
  log(vidaJugador === 0 ? "¡Has perdido!" : "¡Has ganado!");
  document.querySelector("button[onclick='enviarAtaque()']").disabled = true;
  document.querySelector("button[onclick='confirmarListo()']").disabled = true;

  const btnReiniciar = document.getElementById('btn-reiniciar');
  if (btnReiniciar) btnReiniciar.style.display = 'inline-block';
}

function reiniciarCombate() {
  ataquePropio = null;
  ataqueOponente = null;
  listoPropio = false;
  listoOponente = false;
  jugador = crearMonstruo(jugador.nombre, jugador.tipo);
  enemigo = crearMonstruo(enemigo.nombre, enemigo.tipo);
  vidaJugador = jugador.vida;
  vidaRival = enemigo.vida;
  actualizarEstado();
  log("Combate reiniciado.");
  document.querySelector("button[onclick='enviarAtaque()']").disabled = false;
  document.querySelector("button[onclick='confirmarListo()']").disabled = false;

  const btnReiniciar = document.getElementById('btn-reiniciar');
  if (btnReiniciar) btnReiniciar.style.display = 'none';
}

function desconectar() {
  if (conn && conn.open) conn.close();
  if (peer && !peer.destroyed) peer.destroy();
  log("Te desconectaste.");
  alert("Desconectado.");
  location.reload();
}
