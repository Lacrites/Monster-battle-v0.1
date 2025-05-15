// main.js
const presets = {
  Zac: { vida: 27, defensa: 8 },
  Yac: { vida: 20, defensa: 10 },
  Xac: { vida: 15, defensa: 12 }
};

let peer, conn;
let jugador = {}, oponente = {}, recibido = false;
let miAtaque = null, ataqueRecibido = null;

const logDiv = document.getElementById('log');
const estado = document.getElementById('estado');

function log(msg) {
  const p = document.createElement('p');
  p.textContent = msg;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function tirarDado(lados) {
  return Math.floor(Math.random() * lados) + 1;
}

function crearMonstruo(nombre, tipo) {
  const { vida, defensa } = presets[tipo];
  return { nombre, tipo, vida, defensa };
}

function conectar() {
  const nombre = document.getElementById('nombre').value;
  const tipo = document.getElementById('tipo').value;
  jugador = crearMonstruo(nombre, tipo);

  const remoteId = document.getElementById('remote-id').value;
  conn = peer.connect(remoteId);
  conn.on('open', () => {
    log('Conectado al oponente.');
    document.getElementById('juego').style.display = 'block';
    conn.on('data', data => {
      if (data.ataque) {
        ataqueRecibido = data.ataque;
        log(`Recibido ataque: d20=${data.ataque.d20}, d6=${data.ataque.d6}`);
        recibido = true;
        resolverTurno();
      }
    });
  });
}

function enviarAtaque() {
  if (!conn || !conn.open) return;
  const d20 = tirarDado(20);
  const d6 = d20 >= 10 ? tirarDado(6) : 0;
  miAtaque = { d20, d6 };
  log(`Tu ataque: d20=${d20}, d6=${d6}`);
  conn.send({ ataque: miAtaque });
  resolverTurno();
}

function resolverTurno() {
  if (miAtaque && ataqueRecibido) {
    if (miAtaque.d20 >= 10) {
      oponente.vida = (oponente.vida ?? 20) - miAtaque.d6;
    }
    if (ataqueRecibido.d20 >= 10) {
      jugador.vida -= ataqueRecibido.d6;
    }
    actualizarEstado();

    if (jugador.vida <= 0 && oponente.vida <= 0) {
      log("¡Empate!");
    } else if (jugador.vida <= 0) {
      log("¡Perdiste!");
    } else if (oponente.vida <= 0) {
      log("¡Ganaste!");
    }

    miAtaque = null;
    ataqueRecibido = null;
    recibido = false;
  }
}

function actualizarEstado() {
  estado.textContent = `${jugador.nombre} - Vida: ${jugador.vida} | Oponente - Vida: ${oponente.vida ?? '?'} `;
}

window.onload = () => {
  peer = new Peer();
  peer.on('open', id => {
    document.getElementById('my-id').value = id;
    log(`Tu ID es: ${id}`);
  });

  peer.on('connection', connection => {
    conn = connection;
    conn.on('open', () => {
      log('Conexión entrante recibida.');
      document.getElementById('juego').style.display = 'block';
      conn.on('data', data => {
        if (data.ataque) {
          ataqueRecibido = data.ataque;
          log(`Recibido ataque: d20=${data.ataque.d20}, d6=${data.ataque.d6}`);
          recibido = true;
          resolverTurno();
        }
      });
    });
  });
};
