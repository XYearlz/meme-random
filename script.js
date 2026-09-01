// === CONFIGURACIÓN ===
const API_KEY = "TU_OPENROUTER_KEY_AQUI"; // Coloca aquí tu clave de openrouter.ai

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

// 1. Iniciar cámara local
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  .then(stream => {
    miStream = stream;
    localVideo.srcObject = stream;
    statusBox.innerText = "SISTEMA LISTO: Clic en el botón para buscar rival.";
  })
  .catch(err => {
    statusBox.innerText = "ERROR: Permite acceso a la cámara para jugar.";
  });

// 2. Conexión de jugadores con PeerJS
function iniciarBusqueda() {
  statusBox.innerText = "BUSCANDO SALA DE DUELO...";
  resetearEfectos();

  // Intenta unirse a una sala pública estática
  peer = new Peer('duelo-random-room-99');

  peer.on('open', () => {
    statusBox.innerText = "SALA CREADA: Esperando a que entre el Jugador 2...";
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      // Si la sala está ocupada, entra como Jugador 2
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
  peer = new Peer(); // ID dinámico
  peer.on('open', () => {
    statusBox.innerText = "RIVAL ENCONTRADO. Conectando vídeo...";
    const call = peer.call('duelo-random-room-99', miStream);
    call.on('stream', remoteStream => {
      remoteVideo.srcObject = remoteStream;
      iniciarConteoDuelo();
    });
  });
}

// 3. Conteo regresivo
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
      statusBox.innerText = "¡CAPTURA REALIZADA! La IA está juzgando...";
      evaluarDuelo();
    }
  }, 1000);
}

// 4. Capturar frame de video a Base64
function capturarFrame(videoElem) {
  canvas.width = videoElem.videoWidth || 320;
  canvas.height = videoElem.videoHeight || 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg').split(',')[1];
}

// 5. Consulta e interpretación de la IA
async function evaluarDuelo() {
  const foto1 = capturarFrame(localVideo);
  // Si no hay video remoto (ej. prueba en solitario), usa el mismo video local para comparar
  const foto2 = remoteVideo.srcObject ? capturarFrame(remoteVideo) : foto1;

  iaExplanation.innerText = "Analizando grado de aleatoriedad de los objetos con visión artificial...";

  const prompt = `Analiza el objeto mostrado en la Imagen 1 (Jugador 1) y el de la Imagen 2 (Jugador 2).
Responde exactamente con este formato de 3 líneas:
PUNTAJES: [puntos Jugador 1 1-100] - [puntos Jugador 2 1-100]
GANADOR: [Jugador 1 o Jugador 2]
EXPLICACION: [Breve explicación graciosa de por qué el objeto ganador es más 'random']`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-11b-vision-instruct:free",
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
    const textoRespuesta = data.choices[0].message.content;

    procesarResultado(textoRespuesta);
  } catch (error) {
    iaExplanation.innerText = "Error de conexión con la IA. Asegúrate de colocar tu API Key válida en script.js.";
  }
}

function procesarResultado(texto) {
  iaExplanation.innerText = texto;

  // Extraer números si la IA respondió con el formato sugerido
  const matchPuntos = texto.match(/PUNTAJES:\s*(\d+)\s*-\s*(\d+)/i);
  if (matchPuntos) {
    const p1 = matchPuntos[1];
    const p2 = matchPuntos[2];
    score1.innerText = `${p1}/100`;
    score2.innerText = `${p2}/100`;

    if (parseInt(p1) >= parseInt(p2)) {
      marcarGanador(card1, "¡JUGADOR 1 GANA EL DUELO!");
    } else {
      marcarGanador(card2, "¡JUGADOR 2 GANA EL DUELO!");
    }
  } else {
    winnerTitle.innerText = "VEREDICTO DE LA IA";
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
