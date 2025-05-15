// main.js
const peer = new Peer();
let conn;
let jugador = {};
let enemigo = {};
let ataquePendiente = null;
let ataqueRecibido = null;
let listoYo = false;
let listoOtro = false;

peer.on('open', id => {
  document.getElementById('my-id').value = id;
});

function conectar() {
  const remoteId = document.getElementById('remote-id').value;
  conn = peer.connect(remoteId);
  establecerConexion();
}

peer.on('connection', connection => {
  conn = connection;
  establecerConexion();
});

function establecerConexion() {
  conn.on('open', () => {
    const nombre = document.getElementById('nombre').value;
    const tipo = document.getElementById('tipo').value;
    jugador = crearMonstruo(nombre, tipo);
    conn.send({ tipo: "inicio", datos: jugador });
    document.getElementById('juego').style.display = 'block';
    log(`Conectado. Esperando datos del oponente...`);
  });

  conn.on('data', data => {
    if (data.tipo === "inicio") {
      enemigo = data.datos;
      actualizarEstado();
    } else if (data.tipo === "ataque") {
      ataqueRecibido = data.datos;
      log(`Ataque recibido, esperando que ambos estén listos...`);
    } else if (data.tipo === "listo") {
      listoOtro = true;
      intentarResolucion();
    }
  });
}

const presets = {
  Zac: { vida: 27, defensa: 8 },
  Yac: { vida: 20, defensa: 10 },
  Xac: { vida: 15, defensa: 12 }
};

function crearMonstruo(nombre, tipo) {
  const { vida, defensa } = presets[tipo] || presets.Yac;
  return { nombre, tipo, vida, defensa };
}

function tirarDado(lados) {
  return Math.floor(Math.random() * lados) + 1;
}

function enviarAtaque() {
  const d20 = tirarDado(20);
  let danio = 0;
  if (d20 >= 10) {
    danio = tirarDado(6);
  }
  ataquePendiente = { d20, danio };
  conn.send({ tipo: "ataque", datos: ataquePendiente });
  log(`${jugador.nombre} preparó su ataque.`);
}

function confirmarListo() {
  listoYo = true;
  conn.send({ tipo: "listo" });
  intentarResolucion();
}

function intentarResolucion() {
  if (listoYo && listoOtro) {
    aplicarDanios();
    listoYo = false;
    listoOtro = false;
  }
}

function aplicarDanios() {
  if (ataquePendiente) {
    log(`${jugador.nombre} lanzó d20: ${ataquePendiente.d20}`);
    if (ataquePendiente.d20 >= 10) {
      log(`¡${jugador.nombre} inflige ${ataquePendiente.danio} de daño!`);
      enemigo.vida -= ataquePendiente.danio;
    } else {
      log(`${jugador.nombre} falló el ataque.`);
    }
  }

  if (ataqueRecibido) {
    log(`${enemigo.nombre} lanzó d20: ${ataqueRecibido.d20}`);
    if (ataqueRecibido.d20 >= 10) {
      log(`¡${enemigo.nombre} inflige ${ataqueRecibido.danio} de daño!`);
      jugador.vida -= ataqueRecibido.danio;
    } else {
      log(`${enemigo.nombre} falló el ataque.`);
    }
  }

  ataquePendiente = null;
  ataqueRecibido = null;
  actualizarEstado();

  if (jugador.vida <= 0 || enemigo.vida <= 0) {
    const mensaje = jugador.vida <= 0 ? "¡Has perdido!" : "¡Has ganado!";
    log(mensaje);
    document.querySelector("button[onclick='enviarAtaque()']").disabled = true;
    document.querySelector("button[onclick='confirmarListo()']").disabled = true;
    const reinicioBtn = document.createElement("button");
    reinicioBtn.textContent = "Reiniciar";
    reinicioBtn.onclick = () => location.reload();
    document.getElementById("juego").appendChild(reinicioBtn);
  }
}

function actualizarEstado() {
  document.getElementById('estado').textContent =
    `${jugador.nombre} (${jugador.tipo}) - Vida: ${jugador.vida} vs ` +
    `${enemigo.nombre || '...'} (${enemigo.tipo || '?'}) - Vida: ${enemigo.vida || '...'}`;
}

function log(texto) {
  const logDiv = document.getElementById('log');
  const p = document.createElement("p");
  p.textContent = texto;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}
