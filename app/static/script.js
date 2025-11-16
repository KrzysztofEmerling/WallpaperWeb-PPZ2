// ======================================================================= WebGL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert('Unable to initialize WebGL. Your browser may not support it.');
}

// dopasowanie canvasa do okna
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ----------------------------- TEMPLATE SCEN -----------------------------

class Scene {
  constructor(gl, initFn, renderFn) {
    this.gl = gl;
    this.init = initFn;       // np. przygotowanie zasobów
    this.render = renderFn;   // rysowanie w każdej klatce
    this.init(gl);
  }
}

// Scena 0 
const scene0 = new Scene(
  gl,
  (gl) => {
    // init scena 0 
  },
  (gl) => {
    gl.clearColor(1, 0.2, 0.2, 1); // czerwony-ish
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
);

// Scena 1 
const scene1 = new Scene(
  gl,
  (gl) => {
    // init scena 1 
  },
  (gl) => {
    gl.clearColor(0.2, 0.4, 1, 1); // niebieski-ish
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
);

// aktualna scena
let currentScene = scene0;

// funkcja wywoływana z listenera przycisków (data-scene="0"/"1")
function setScene(index) {
  switch (index) {
    case 0:
      currentScene = scene0;
      break;
    case 1:
      currentScene = scene1;
      break;
    default:
      console.warn('Nieznany indeks sceny:', index);
      return;
  }
}

// pętla rysująca
function renderLoop() {
  resizeCanvas();
  if (currentScene && typeof currentScene.render === 'function') {
    currentScene.render(gl);
  }
  requestAnimationFrame(renderLoop);
}

renderLoop();


// ======================================================================= Reszta Skryptow

function sliderValue(slider, input){
  const min = slider.min;
  const max = slider.max;

  let val = parseFloat(input.value);

  if (val < min) val = min;
  if (val > max) val = max;

  slider.value = val;
}

function restoreDefault(input){
  if (input.value === ''){
    input.value = input.min;
  }
}

function inputValue(slider, input){
  input.value = slider.value;
}

function inputValidation(input){
  const min = input.min;
  const max = input.max;

  let val = parseFloat(input.value);

  if (val < min) val = min;
  if (val > max) val = max;

  input.value = val;
}

function createJSON(){
  const sliders = document.querySelectorAll('.container input.slider');
  const data = {};

  sliders.forEach(input => {
    data[input.id] = input.value;
  });

  const jsonStr = JSON.stringify(data, null, 2)

  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `config-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function loadJSON() {
  const fileInput = document.getElementById('formFile');
  const sliders = document.querySelectorAll('.container input.slider');
  const data_min = {};
  const data_max = {};

  sliders.forEach(i => {
    data_min[i.id] = i.min;
    data_max[i.id] = i.max;
  });

  if (!fileInput) {
    alert('Nie znaleziono inputa pliku JSON w HTML.');
    return;
  }

  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);

      for (const id in data) {
        const element = document.getElementById(id);
        if (element) {
          if (data[id] < data_min[id]) {
            element.value = data_min[id];
          }
          else if (data[id] > data_max[id]) {
            element.value = data_max[id];
          }
          else {
            element.value = data[id];
          }
          element.dispatchEvent(new Event('input')); 
        }
      }
      
    } catch (err) {
      alert('Błąd podczas wczytywania pliku JSON.');
      console.error(err);
    }
  };

  reader.readAsText(file);
}

// ======================================================================= Podpiecia funkcji pod elementy HTML

const import_btn = document.getElementById('import-btn'); //dostajemy się do elementu

import_btn.addEventListener('click', () => {
  loadJSON();
});

// ======= Pobieranie pliku JSON

const export_btn = document.getElementById('export-btn');

export_btn.addEventListener('click', () => {
  createJSON();
});

// ======= Slider 1

const slider1 = document.getElementById('slider1');
const value1 = document.getElementById('value1');

slider1.addEventListener('input', () => {
  inputValue(slider1, value1);
});

value1.addEventListener('input', () => {
  restoreDefault(value1);
  sliderValue(slider1, value1);
  inputValidation(value1);
});

// ======= Slider 2

const slider2 = document.getElementById('slider2');
const value2 = document.getElementById('value2');

slider2.addEventListener('input', () => {
  inputValue(slider2, value2);
});

value2.addEventListener('input', () => {
  restoreDefault(value2);

  sliderValue(slider2, value2);
  inputValidation(value2);
});

// ======= Slider 3

const slider3 = document.getElementById('slider3');
const value3 = document.getElementById('value3');

slider3.addEventListener('input', () => { 
  inputValue(slider3, value3);
});

value3.addEventListener('input', () => {
  restoreDefault(value3);
  sliderValue(slider3, value3);
  inputValidation(value3);
});


// ======= RGB sliders

const red_slider = document.getElementById('red-slider');
const red_value = document.getElementById('red-value');

red_slider.addEventListener('input', () => { 
  inputValue(red_slider, red_value);
});

red_value.addEventListener('input', () => {
  restoreDefault(red_value);
  sliderValue(red_slider, red_value);
  inputValidation(red_value);
});

const green_slider = document.getElementById('green-slider');
const green_value = document.getElementById('green-value');

green_slider.addEventListener('input', () => { 
  inputValue(green_slider, green_value);
});

green_value.addEventListener('input', () => {
  restoreDefault(green_value);
  sliderValue(green_slider, green_value);
  inputValidation(green_value);
});

const blue_slider = document.getElementById('blue-slider');
const blue_value = document.getElementById('blue-value');

blue_slider.addEventListener('input', () => { 
  inputValue(blue_slider, blue_value);
});

blue_value.addEventListener('input', () => {
  restoreDefault(blue_value);
  sliderValue(blue_slider, blue_value);
  inputValidation(blue_value);
});

document.addEventListener('DOMContentLoaded', () => {
  const sceneButtons = document.querySelectorAll('.scene-btn');

  sceneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          const sceneIndex = parseInt(btn.dataset.scene, 10);

          sceneButtons.forEach(b => b.classList.remove('active-scene'));
          btn.classList.add('active-scene');

          if (typeof setScene === 'function') {
              setScene(sceneIndex);
          } else {
              console.warn('Funkcja setScene(sceneIndex) nie jest zdefiniowana w script.js');
          }
      });
  });
});
