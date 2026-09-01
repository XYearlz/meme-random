// Reemplaza esto con tu clave gratuita de OpenRouter (openrouter.ai)
const API_KEY = "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"; 

const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
let foto1 = null, foto2 = null;

// Activa la cámara
navigator.mediaDevices.getUserMedia({ video: true })
  .then(s => video.srcObject = s)
  .catch(e => alert("Permite el acceso a la cámara para jugar."));

function capturar() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg').split(',')[1];
}

function iniciarJuego() {
  correrContador("Jugador 1: Muestra tu objeto...", 5, () => {
    foto1 = capturar();
    correrContador("Jugador 2: ¡Tu turno!", 5, () => {
      foto2 = capturar();
      evaluarIA();
    });
  });
}

function correrContador(mensaje, segundos, callback) {
  document.getElementById('resultado').innerText = mensaje;
  let t = segundos;
  let interval = setInterval(() => {
    document.getElementById('timer').innerText = t--;
    if (t < 0) {
      clearInterval(interval);
      callback();
    }
  }, 1000);
}

async function evaluarIA() {
  document.getElementById('resultado').innerText = "Analizando objetos con IA...";
  
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            { type: "text", text: "Evalúa los dos objetos principales mostrados en las dos imágenes. Asigna a cada uno una puntuación de aleatoriedad del 1 al 100, indica cuál gana y explica el porqué brevemente." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${foto1}` } },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${foto2}` } }
          ]
        }]
      })
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      document.getElementById('resultado').innerText = data.choices[0].message.content;
    } else {
      document.getElementById('resultado').innerText = "Error: Verifica tu API Key de OpenRouter.";
    }
  } catch (error) {
    document.getElementById('resultado').innerText = "Error al conectar con la IA.";
  }
}
