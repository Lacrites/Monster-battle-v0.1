const peer = new Peer();
let conn;
let jugador = {};
let enemigo = {};

let ataquePropio = null;
let ataqueOponente = null;
let listoPropio = false;
let listoOponente = false;

let vidaJugador = 0;
let vidaRival = 0;

peer.on('open', id => {
  document.getElementById('my-id').value = id;
});

function conectar() {
  const remoteId = document.getElementById('remote-id').value.trim();
  if (!remoteId) {
    alert("Por favor ingresa el ID del oponente");
    return;
  }
  conn = peer.connect(remoteId);
  establecerConexion();
}

peer.on('connection', connection => {
  conn = connection;
  establecerConexion();
});

function establecerConexion() {
  conn.on('open', () => {
    const nombre = document.getElementById('nombre').value.trim();
    const tipo = document.getElementById('tipo').value;
    if (!nombre) {
      alert("Ingresa tu nombre para continuar");
      conn.close();
      return;
    }
    jugador = crearMonstruo(nombre, tipo);
    vidaJugador = jugador.vida;
    conn.send({ type: "inicio", datos: jugador });
    document.getElementById('juego').style.display = 'block';
    log("Conectado. Esperando datos del oponente...");
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
      if (listoPropio) {
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
  Zac: { vida: 30, defensa: 8 },
  Yac: { vida: 20, defensa: 10 },
  Xac: { vida: 10, defensa: 12 }
};

function crearMonstruo(nombre, tipo) {
  const { vida, defensa } = presets[tipo] || presets.Yac;
  return { nombre, tipo, vida, defensa };
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
  const tiradaD6 = tirarDado(6);
  ataquePropio = { tiradaD20, tiradaD6 };
  conn.send({ type: "ataque", ataque: ataquePropio });
  log(`Preparaste tu ataque: D20=${tiradaD20}, D6=${tiradaD6}`);
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
  if (listoOponente) {
    resolverTurno();
  }
}

function resolverTurno() {
  let danioAlRival = ataquePropio.tiradaD20 >= 10 ? ataquePropio.tiradaD6 : 0;
  let danioRecibido = ataqueOponente.tiradaD20 >= 10 ? ataqueOponente.tiradaD6 : 0;

  vidaRival = Math.max(0, vidaRival - danioAlRival);
  vidaJugador = Math.max(0, vidaJugador - danioRecibido);

  log(`Infligiste ${danioAlRival} de daño a ${enemigo.nombre}.`);
  log(`Recibiste ${danioRecibido} de daño de ${enemigo.nombre}.`);
  actualizarEstado();

  // Enviar estado actualizado para sincronización
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

  // Crear botón reiniciar si no existe ya
  if (!document.getElementById('btn-reiniciar')) {
    const btnReiniciar = document.createElement('button');
    btnReiniciar.textContent = 'Reiniciar';
    btnReiniciar.id = 'btn-reiniciar';
    btnReiniciar.onclick = () => location.reload();
    document.getElementById('juego').appendChild(btnReiniciar);
  }
}
