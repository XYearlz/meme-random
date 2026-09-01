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

let miStream = null;
let peer = null;

// 1. Inicializar cámara local
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    miStream = stream;
    localVideo.srcObject = stream;
    statusBox.innerText = "SISTEMA LISTO: Clic en el botón para buscar rival.";
  })
  .catch(() => {
    statusBox.innerText = "ERROR: Permite el acceso a la cámara en tu navegador.";
  });

// 2. Conexión Multijugador (PeerJS)
function iniciarBusqueda() {
  statusBox.innerText = "BUSCANDO SALA DE DUELO...";
  resetearEfectos();

  peer = new Peer('duelo-random-room-99');

  peer.on('open', () => {
    statusBox.innerText = "SALA CREADA: Esperando al Jugador 2...";
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
}

function conectarComoJugador2() {
  peer = new Peer();
  peer.on('open', () => {
    statusBox.innerText = "RIVAL ENCONTRADO. Conectando vídeo...";
    const call = peer.call('duelo-random-room-99', miStream);
    call.on('stream', remoteStream => {
      remoteVideo.srcObject = remoteStream;
      iniciarConteoDuelo();
    });
  });
}

// 3. Temporizador de pantalla
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
      statusBox.innerText = "¡FOTO CAPTURADA! Procesando con IA...";
      evaluarDuelo();
    }
  }, 1000);
}

// 4. Capturar frame de vídeo
function capturarFrame(videoElem) {
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElem, 0, 0, 320, 240);
  return canvas.toDataURL('image/jpeg', 0.5);
}

// 5. Evaluación libre mediante Puter.js
async function evaluarDuelo() {
  const foto1 = capturarFrame(localVideo);
  const foto2 = remoteVideo.srcObject ? capturarFrame(remoteVideo) : foto1;

  iaExplanation.innerText = "Analizando objetos con visión artificial...";

  const prompt = `Analiza el objeto de la Foto 1 (Jugador 1) y el de la Foto 2 (Jugador 2).
Responde STRICTAMENTE con este formato de 3 líneas:
PUNTAJES: [1-100] - [1-100]
GANADOR: [Jugador 1 o Jugador 2]
EXPLICACION: [Razón corta y graciosa de por qué el objeto ganador es más 'random']`;

  try {
    const response = await puter.ai.chat(prompt, foto1, foto2);
    procesarResultado(response.toString());
  } catch (error) {
    iaExplanation.innerText = "Error al conectar con la IA. Revisa que agregaste la etiqueta del script de Puter en index.html.";
  }
}

// 6. Formateo de puntuación e interfaz
function procesarResultado(texto) {
  iaExplanation.innerText = texto;

  const matchPuntos = texto.match(/PUNTAJES:\s*(\d+)\s*-\s*(\d+)/i);
  if (matchPuntos) {
    const p1 = parseInt(matchPuntos[1]);
    const p2 = parseInt(matchPuntos[2]);
    score1.innerText = `${p1}/100`;
    score2.innerText = `${p2}/100`;

    if (p1 >= p2) {
      marcarGanador(card1, "¡JUGADOR 1 GANA EL DUELO!");
    } else {
      marcarGanador(card2, "¡JUGADOR 2 GANA EL DUELO!");
    }
  } else {
    winnerTitle.innerText = "VEREDICTO IA";
  }
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
}
