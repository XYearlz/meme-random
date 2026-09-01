// === CONFIGURACIÓN Y VARIABLES GLOBALES ===
const API_KEY = "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"; // Sustituye por tu clave sk-or-v1-...

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
  .catch(err => {
    statusBox.innerText = "ERROR: Activa los permisos de la cámara en el navegador.";
  });

// 2. Conexión de jugadores mediante PeerJS
function iniciarBusqueda() {
  statusBox.innerText = "BUSCANDO SALA DE DUELO...";
  resetearEfectos();

  peer = new Peer('duelo-random-room-99');

  peer.on('open', () => {
    statusBox.innerText = "SALA CREADA: Esperando a que entre el Jugador 2...";
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
    statusBox.innerText = "RIVAL ENCONTRADO. Conectando cámara...";
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
      statusBox.innerText = `¡MUESTRAN SU OBJETO EN ${tiempo}!`;
    } else {
      clearInterval(interval);
      countdownOverlay.classList.remove('active');
      statusBox.innerText = "¡FOTO CAPTURADA! Procesando con la IA...";
      evaluarDuelo();
    }
  }, 1000);
}

// 4. Capturar y comprimir imagen a Base64 (320x240 px, 50% calidad)
function capturarFrame(videoElem) {
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElem, 0, 0, 320, 240);
  return canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
}

// 5. Evaluación multimodal con OpenRouter
async function evaluarDuelo() {
  const foto1 = capturarFrame(localVideo);
  const foto2 = remoteVideo.srcObject ? capturarFrame(remoteVideo) : foto1;

  iaExplanation.innerText = "Analizando objetos con IA...";

  const prompt = `Analiza el objeto de la Foto 1 (Jugador 1) y el de la Foto 2 (Jugador 2).
Responde exactamente con este formato de 3 líneas:
PUNTAJES: [1-100] - [1-100]
GANADOR: [Jugador 1 o Jugador 2]
EXPLICACION: [Razón corta y divertida de por qué el objeto ganador es más 'random']`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href,
        "X-Title": "Duelo Random"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${foto1}` } },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${foto2}` } }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      iaExplanation.innerText = `Error de API (${data.error.code || 'Desconocido'}): ${data.error.message}`;
      return;
    }

    if (data.choices && data.choices[0]) {
      procesarResultado(data.choices[0].message.content);
    } else {
      iaExplanation.innerText = "La IA no devolvió una respuesta válida. Reintenta el duelo.";
    }
  } catch (error) {
    iaExplanation.innerText = "Error de conexión en la red o bloqueo de la API.";
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
