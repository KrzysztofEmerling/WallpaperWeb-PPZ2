// ======================================================================= WebGL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");
const scenesData = fetchSceneValues();
let activeScene = null;


if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Funkcja do tworzenia i kompilacji shaderów
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Błąd kompilacji shadera:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Funkcja do tworzenia programu
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Błąd linkowania programu:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

//ładowanie shaderów
async function loadShaderSource(name) {
  const response = await fetch(`/static/shaders/${name}`);
  if (!response.ok) {
    throw new Error(`Nie udało się załadować shadera: ${name}`);
  }
  return await response.text();
}

async function init() {
  const vertexShaderSource = await loadShaderSource('vertex.shader');
  const fragmentShaderSource = await loadShaderSource('fragment.shader');
  const fragmentAsciiShaderSource = await loadShaderSource('fragment_ascii.shader');
  const gammaCorrectionShaderSource = await loadShaderSource('gamma_correction.shader');

  return {vertexShaderSource,
          fragmentShaderSource,
          fragmentAsciiShaderSource,
          gammaCorrectionShaderSource};
}

(async () => {
  const {vertexShaderSource,
         fragmentShaderSource,
         fragmentAsciiShaderSource,
         gammaCorrectionShaderSource} = await init();

  // Kompiluj shadery
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const fragmentAsciiShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentAsciiShaderSource);
  // const gammaCorrectionShader = createShader(gl, gl., gammaCorrectionShaderSource);
  // Stwórz program i ustaw go
  const program = createProgram(gl, vertexShader, fragmentShader);
  const programAscii = createProgram(gl, vertexShader, fragmentAsciiShader);
  gl.useProgram(program);


  // Ustaw bufor współrzędnych prostokąta obejmującego cały canvas
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [
    -1, -1, 
    1, -1, 
    -1,  1, 
    -1,  1, 
    1, -1, 
    1,  1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Połącz atrybut pozycji z buforem
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const image = new Image();
  image.src = 'static/images/image.png';
  image.onload = () => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const uTextureLocation = gl.getUniformLocation(program, "u_Texture");
    gl.uniform1i(uTextureLocation, 0);
    scenes.scene2.render(0);
    
  }


  // ============================================================ Podpinanie uniformów:
  const uTimeLocation = gl.getUniformLocation(program, "u_Time");
  const uColorLocation = gl.getUniformLocation(program, "u_Color");
  //===================================================================================

  function rgbCreator(red, green, blue){
    const red_slider = document.getElementById(red);
    const green_slider = document.getElementById(green);
    const blue_slider = document.getElementById(blue);

    const r = red_slider.value / 255;
    const g = green_slider.value / 255;
    const b = blue_slider.value / 255;
    const a = 1.0;

    const colors = [r, g, b, a];

    return colors;
  }

  const scenes = {
    scene1: {
      program: program,
      render: function(time) {
        gl.useProgram(this.program);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const [r,g,b,a] = rgbCreator('red-slider','green-slider','blue-slider');
        gl.uniform4f(uColorLocation, r, g, b, a);
        gl.uniform1f(uTimeLocation, time * 0.001); // time w sekundach

        gl.drawArrays(gl.TRIANGLES,0,6);
      }
    },
    scene2: {
      program: programAscii,
      render: function(time) {
        gl.useProgram(this.program);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES,0,6);

      }
    }
  };

  activeScene = 'scene1';

  function toggleScene() {
    if (activeScene === 'scene1') {
        activeScene = 'scene2';
    } else {
        activeScene = 'scene1';
    }
  }

  const switch_scene = document.getElementById('switch-scene');

  switch_scene.addEventListener('change', () => {
    updateSceneValues(scenesData, activeScene);
    toggleScene();
    setSceneValues(scenesData, activeScene);
  });

  function render(time){
    scenes[activeScene].render(time);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

})();

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

function fetchSceneValues(){
  const sliders = document.querySelectorAll('.container input.slider');
  const values = { scene1: {}, scene2: {} };

  sliders.forEach(input => {
    values.scene1[input.id] = input.value;
    values.scene2[input.id] = input.value;
  });

  return values;
}

function updateSceneValues(array, scene){
  const sliders = document.querySelectorAll('.container input.slider');

  sliders.forEach(input => {
    array[scene][input.id] = input.value;
  });
}

function setSceneValues(array, scene){
  const sliders = document.querySelectorAll('.container input.slider');

  sliders.forEach(input => {
    input.value = array[scene][input.id]
    input.dispatchEvent(new Event('input'));
  });
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
          if (Number(data[id]) < data_min[id]) {
            element.value = data_min[id];
          }
          else if (Number(data[id]) > data_max[id]) {
            element.value = data_max[id];
          }
          else {
            element.value = data[id];
          }
          element.dispatchEvent(new Event('input')); // jeśli chcesz odświeżyć widok
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
