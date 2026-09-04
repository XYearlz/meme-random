// Exposición de funciones globales
window.guardarUsuario = function() {
  const input = document.getElementById('usernameInput').value.trim();
  if (input !== "") {
    localStorage.setItem('duelo_username', input);
    cargarPerfil();
  }
};

window.cerrarSesion = function() {
  localStorage.removeItem('duelo_username');
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('profile-section').style.display = 'none';
  miNombre = "Jugador 1";
  document.getElementById('nameP1').innerText = "JUGADOR 1 (TÚ)";
};

window.actionFindMatch = function() {
  document.getElementById('end-screen').style.display = 'none';
  iniciarBusqueda();
};

window.actionRematch = function() {
  document.getElementById('end-screen').style.display = 'none';
  resetearEfectos();
  iniciarConteoDuelo();
};

window.actionReturnMenu = function() {
  document.getElementById('end-screen').style.display = 'none';
  resetearEfectos();
  statusBox.innerText = "SISTEMA LISTO: Haz clic en el botón para buscar rival.";
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusBox = document.getElementById('status');
const countdownOverlay = document.getElementById('countdown-overlay');
const canvas = document.getElementById('canvas');
const score1 = document.getElementById('score1');
const score2 = document.getElementById('score2');
const winnerTitle = document.getElementById('winner-title');
const iaExplanation = document.getElementById('ia-explanation');
const card1 = document.getElementById('card1');
const card2 = document.getElementById('card2');
const nameP1 = document.getElementById('nameP1');
const nameP2 = document.getElementById('nameP2');

let miStream = null;
let peer = null;
let miNombre = "Jugador 1";
let rivalNombre = "Jugador 2";

function cargarPerfil() {
  const guardado = localStorage.getItem('duelo_username');
  if (guardado) {
    miNombre = guardado;
    document.getElementById('displayMyName').innerText = miNombre;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
    nameP1.innerText = `${miNombre.toUpperCase()} (TÚ)`;
  }
}

cargarPerfil();

// 1. Inicialización de Cámara
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    miStream = stream;
    localVideo.srcObject = stream;
    statusBox.innerText = "SISTEMA LISTO: Haz clic en el botón para buscar rival.";
  })
  .catch(() => {
    statusBox.innerText = "ERROR: Permite el acceso a la cámara en tu navegador.";
  });

// 2. PeerJS Conexión Multijugador
window.iniciarBusqueda = function() {
  statusBox.innerText = "BUSCANDO SALA DE DUELO...";
  resetearEfectos();

  peer = new Peer('duelo-random-room-99');

  peer.on('open', () => {
    statusBox.innerText = `SALA CREADA (${miNombre}): Esperando al Rival...`;
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      conectarComoJugador2();
    }
  });

  peer.on('call', call => {
    call.answer(miStream);
    call.on('stream', remoteStream => {
      remoteVideo.srcObject = remoteStream;
      iniciarConteoDuelo();
    });
  });

  peer.on('connection', conn => {
    conn.on('data', data => {
      if (data.nombre) {
        rivalNombre = data.nombre;
        nameP2.innerText = `${rivalNombre.toUpperCase()} (RIVAL)`;
        conn.send({ nombre: miNombre });
      }
    });
  });
};

function conectarComoJugador2() {
  peer = new Peer();
  peer.on('open', () => {
    statusBox.innerText = "RIVAL ENCONTRADO. Conectando vídeo...";
    
    const call = peer.call('duelo-random-room-99', miStream);
    call.on('stream', remoteStream => {
      remoteVideo.srcObject = remoteStream;
      iniciarConteoDuelo();
    });

    const conn = peer.connect('duelo-random-room-99');
    conn.on('open', () => {
      conn.send({ nombre: miNombre });
    });
    conn.on('data', data => {
      if (data.nombre) {
        rivalNombre = data.nombre;
        nameP2.innerText = `${rivalNombre.toUpperCase()} (RIVAL)`;
      }
    });
  });
}

// 3. Temporizador de Duelo
function iniciarConteoDuelo() {
  let tiempo = 5;
  countdownOverlay.classList.add('active');
  countdownOverlay.innerText = tiempo;

  const interval = setInterval(() => {
    tiempo--;
    if (tiempo > 0) {
      countdownOverlay.innerText = tiempo;
      statusBox.innerText = `¡MUESTREN SU OBJETO EN ${tiempo}!`;
    } else {
      clearInterval(interval);
      countdownOverlay.classList.remove('active');
      statusBox.innerText = "¡FOTO CAPTURADA! Analizando con IA Local...";
      evaluarDuelo();
    }
  }, 1000);
}

// 4. Analizador de Píxeles Local
function analizarPixeles(videoElem) {
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElem, 0, 0, 160, 120);
  
  const frame = ctx.getImageData(0, 0, 160, 120);
  const data = frame.data;
  
  let variacionColor = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    variacionColor += Math.abs(r - g) + Math.abs(g - b);
  }

  const factorCaos = (variacionColor / (data.length / 16)) * 2;
  return Math.min(95, Math.max(15, Math.floor(factorCaos + Math.random() * 40 + 20)));
}

// 5. Evaluación de Ganador
function evaluarDuelo() {
  const p1 = analizarPixeles(localVideo);
  const p2 = remoteVideo.srcObject ? analizarPixeles(remoteVideo) : Math.floor(Math.random() * 60 + 20);

  const razones = [
    "presenta patrones de luz y formas desordenadas altamente sospechosas.",
    "desafía toda lógica geométrica y sentido común.",
    "posee un nivel de rareza visual cuantitativamente superior.",
    "registró una anomalía de contraste que desconcertó al algoritmo."
  ];

  const razon = razones[Math.floor(Math.random() * razones.length)];
  const ganadorNombre = p1 >= p2 ? miNombre : rivalNombre;

  const resultado = `PUNTAJES: ${p1} - ${p2}\nGANADOR: ${ganadorNombre}\nEXPLICACION: El objeto de ${ganadorNombre} ${razon}`;

  setTimeout(() => {
    procesarResultado(resultado, p1, p2, ganadorNombre);
  }, 1200);
}

// 6. Veredicto Final y Carga del Modal Game Over
function procesarResultado(texto, p1, p2, ganadorNombre) {
  iaExplanation.innerText = texto;
  score1.innerText = `${p1}/100`;
  score2.innerText = `${p2}/100`;

  const soyGanador = p1 >= p2;

  const endTitle = document.getElementById('end-status-title');
  const endSub = document.getElementById('end-status-sub');
  const scoreYou = document.getElementById('end-score-you');
  const scoreRival = document.getElementById('end-score-rival');
  const eloYou = document.getElementById('end-elo-you');
  const eloRival = document.getElementById('end-elo-rival');
  const labelRival = document.getElementById('end-label-rival');

  scoreYou.innerText = (p1 / 20).toFixed(1);
  scoreRival.innerText = (p2 / 20).toFixed(1);
  labelRival.innerText = rivalNombre.toUpperCase();

  if (soyGanador) {
    endTitle.innerText = "VICTORY";
    endTitle.classList.add('victory');
    endSub.innerText = `OVER ${rivalNombre.toUpperCase()}`;
    eloYou.innerText = "+19 ELO";
    eloYou.style.color = "#00f5a0";
    eloRival.innerText = "-21 ELO";
    eloRival.style.color = "#ef4444";
    marcarGanador(card1, `¡${ganadorNombre.toUpperCase()} GANA EL DUELO!`);
  } else {
    endTitle.innerText = "BRUTALIZED";
    endTitle.classList.remove('victory');
    endSub.innerText = `BY ${rivalNombre.toUpperCase()}`;
    eloYou.innerText = "-21 ELO";
    eloYou.style.color = "#ef4444";
    eloRival.innerText = "+19 ELO";
    eloRival.style.color = "#00f5a0";
    marcarGanador(card2, `¡${ganadorNombre.toUpperCase()} GANA EL DUELO!`);
  }

  setTimeout(() => {
    document.getElementById('end-screen').style.display = 'flex';
  }, 1000);
}

function marcarGanador(cardGanadora, titulo) {
  cardGanadora.classList.add('winner');
  winnerTitle.innerText = titulo;
}

function resetearEfectos() {
  card1.classList.remove('winner');
  card2.classList.remove('winner');
  score1.innerText = "--/100";
  score2.innerText = "--/100";
  winnerTitle.innerText = "ESPERANDO VEREDICTO...";
  iaExplanation.innerText = "";
  rivalNombre = "Jugador 2";
  nameP2.innerText = "JUGADOR 2 (RIVAL)";
}
