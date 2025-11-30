// ======================================================================= WebGL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");
const scenesData = fetchSceneValues();
const sceneAvailableShaders = {
  scene1: ['steps', 'rgb'], // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 1, zawiera id elementow z html
  scene2: ['brightness', 'gamma', 'contrast', 'gauss', 'sobel', 'perlin', 'voronoii', 'bloom']  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 2, zawiera id elementow z html
}

console.log(sceneAvailableShaders);

updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);

let activeScene = null;
let renderScene1Requested = true;

// ======= render stats
const fpsCounter = document.getElementById('fps');
const frametimeCounter = document.getElementById('frametime');

let lastFrametime = performance.now();
let lastFps = performance.now();
let fpsFrames = 0;

let fps = 0;
let frametime = 0;

function updateStats(){
  const now = performance.now();

  frametime = now - lastFrametime;
  lastFrametime = now;

  fpsFrames++;
  if(now - lastFps >= 1000){
    fps = fpsFrames;
    fpsFrames = 0;
    lastFps = now;
    fpsCounter.textContent = fps;
    frametimeCounter.textContent = frametime.toFixed(1);
  }
}

// =======


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
  const fragmentAsciiShaderSource = await loadShaderSource('line_ascii.shader');

  return {vertexShaderSource,
          fragmentShaderSource,
          fragmentAsciiShaderSource};
}

(async () => {
  const {vertexShaderSource,
         fragmentShaderSource,
         fragmentAsciiShaderSource} = await init();

  // Kompiluj shadery
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const fragmentAsciiShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentAsciiShaderSource);

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
  const uResolutionLocation = gl.getUniformLocation(program, "u_Resolution");
  const uStepSizeLocation = gl.getUniformLocation(program, "u_StepSize");

  // const uBrightnessLocation = gl.getUniformLocation(programAscii, "u_Brightness");
  // const uShadowsLocation = gl.getUniformLocation(programAscii, "u_Shadows");
  // const uMidtonesLocation = gl.getUniformLocation(programAscii, "u_Midtones");
  // const uHighlightsLocation = gl.getUniformLocation(programAscii, "u_Highlights");
  //===================================================================================

  const scenes = {
    scene1: {
      program: program,
      render: function(time) {
        updateStats();
        if(renderScene1Requested)
        {
          gl.useProgram(this.program);
          gl.viewport(0,0,canvas.width,canvas.height);
          gl.clearColor(0,0,0,1);
          gl.clear(gl.COLOR_BUFFER_BIT);

          gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
          
          const step_slider = document.getElementById("stepsize-slider");
          gl.uniform1f(uStepSizeLocation, step_slider.value);

          gl.drawArrays(gl.TRIANGLES,0,6); 
          renderScene1Requested = false; 
        }
      }
    },
    scene2: {
      program: programAscii,
      render: function(time) {
        updateStats();
        if(renderScene1Requested)
        {
          gl.useProgram(this.program);
          gl.viewport(0,0,canvas.width,canvas.height);
          gl.clearColor(0,0,0,1);
          gl.clear(gl.COLOR_BUFFER_BIT);

          // const [brightness_val, shadows_val, midtones_val, hightlights_val] = brightness('brightness-slider', 'shadows-slider', 'midtones-slider', 'highlights-slider');

          // gl.uniform1f(uBrightnessLocation, parseFloat(brightness_val));
          // gl.uniform1f(uShadowsLocation, parseFloat(shadows_val));
          // gl.uniform1f(uMidtonesLocation, parseFloat(midtones_val));
          // gl.uniform1f(uHighlightsLocation, parseFloat(hightlights_val));

          gl.drawArrays(gl.TRIANGLES,0,6);
          renderScene1Requested = false;
        }
      }
    }
  };

  activeScene = 'scene2';

  function toggleScene() {
    renderScene1Requested = true;
    if (activeScene === 'scene1') {
        updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);
        activeScene = 'scene2';
    } else {
        
        updateSceneShaders(sceneAvailableShaders.scene1, sceneAvailableShaders.scene2);
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

// ======================================================================= Funkcje obslugi shaderow

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

function brightness(bright, shadow, midtone, highlight){
  const brighness_value = document.getElementById(bright).value;
  const shadows_value = document.getElementById(shadow).value;
  const midtones_value = document.getElementById(midtone).value;
  const highlights_value = document.getElementById(highlight).value;

  const data = [brighness_value, shadows_value, midtones_value, highlights_value];

  return data;
}

function gamma(){}

function contrast(){}

function differenceOfGaussian(){}

function sobel(){}

function perlin(){}

function voronoii(){}

function bloom(){}

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
  const sliders = document.querySelectorAll('input.slider');
  const values = { scene1: {}, scene2: {} };

  sliders.forEach(input => {
    values.scene1[input.id] = input.value;
    values.scene2[input.id] = input.value;
  });

  return values;
}

function updateSceneValues(array, scene){
  const sliders = document.querySelectorAll('input.slider');

  sliders.forEach(input => {
    array[scene][input.id] = input.value;
  });
}

function setSceneValues(array, scene){
  const sliders = document.querySelectorAll('input.slider');

  sliders.forEach(input => {
    input.value = array[scene][input.id]
    input.dispatchEvent(new Event('input'));
  });
}

function updateSceneShaders(scene1, scene2){
  scene2.forEach(id => {
    document.getElementById(id).classList.add('remove');
  });

  scene1.forEach(id => {
    document.getElementById(id).classList.remove('remove');
  });
}

function createJSON(){
  const sliders = document.querySelectorAll('input.slider');
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
  const sliders = document.querySelectorAll('input.slider');
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

const sliderInputs = document.querySelectorAll('input.slider');
const valueInputs = document.querySelectorAll('input.single-value, input.multi-value');

sliderInputs.forEach((element, index) => {
  const sliderID = element;
  const valueID = valueInputs[index];

  sliderID.addEventListener('input', () => {
    inputValue(sliderID, valueID);
  });
});

valueInputs.forEach((element, index) => {
  const sliderID = sliderInputs[index]; 
  const valueID = element;

  valueID.addEventListener('input', () => {
    restoreDefault(valueID);
    sliderValue(sliderID, valueID);
    inputValidation(valueID);
  });
});

const buttonRenderScene1 = document.getElementById('render-scene1-button');
buttonRenderScene1.addEventListener('click', () => {
  renderScene1Requested = true;  
});
