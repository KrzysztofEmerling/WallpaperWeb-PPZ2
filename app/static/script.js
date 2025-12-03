import { poissonDiskSampling } from "./poisson.js";
import { createAtlas } from "./atlas.js";

// =================================== WebGL ===================================

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");
const scenesData = fetchSceneValues();
const sceneAvailableShaders = {
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 1, zawiera id elementow z html
  scene1: ['steps', 'rgb'],
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 2, zawiera id elementow z html
  scene2: ['brightness', 'gamma', 'contrast', 'gauss', 'sobel', 'bloom', 'sky-creator']
}

updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);

let activeScene = null;
let renderScene1Requested = true;
let renderScene2Requested = false;
let sourceTexture = null;

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

if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderScene2Requested = true;
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

  // ZWRACAMY OBIEKT – tu musi być return { ... }
  return {
      vertexShaderSource,
      fragmentShaderSource,
      fragmentAsciiShaderSource
  };
}

function createTextureFromImage(gl, image){
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
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
    gl.activeTexture(gl.TEXTURE0);
    sourceTexture = createTextureFromImage(gl, image);
    const uTextureLocation = gl.getUniformLocation(programAscii, "u_Texture");
    gl.uniform1i(uTextureLocation, 0);
    scenes.scene2.render(0);
    renderScene2Requested = true;
  }

  const charAtlas = createAtlas("@#$%^&*()_+!.,<>");

  gl.activeTexture(gl.TEXTURE1);
  sourceTexture = createTextureFromImage(gl, charAtlas.image);
  const uCharAtlasLocation = gl.getUniformLocation(programAscii, "u_CharAtlas");
  gl.uniform1i(uCharAtlasLocation, 1);

  const lineAtlas = createAtlas("-/\\|");

  gl.activeTexture(gl.TEXTURE2);
  sourceTexture = createTextureFromImage(gl, lineAtlas.image);
  const uLineAtlasLocation = gl.getUniformLocation(programAscii, "u_LineAtlas");
  gl.uniform1i(uLineAtlasLocation, 2);

  // ========================== Podpinanie uniformów ===========================
  const uResolutionLocation       = gl.getUniformLocation(program, "u_Resolution");
  const uStepSizeLocation         = gl.getUniformLocation(program, "u_StepSize");
  const uHaloColorLocation        = gl.getUniformLocation(program, "u_HaloColor");

  const uArraySizeLocation        = gl.getUniformLocation(programAscii, "u_ArraySize");
  const uArrayLocation            = gl.getUniformLocation(programAscii, "u_Array");
  const uResolution1Location      = gl.getUniformLocation(programAscii, "u_Resolution");
  // ===========================================================================
  const uBrightnessLocation       = gl.getUniformLocation(programAscii, "u_Brightness");
  const uSobelStatusLocation      = gl.getUniformLocation(programAscii, "u_SobelStatus");
  const uGammaLocation            = gl.getUniformLocation(programAscii, "u_Gamma");
  const uContrastLocation         = gl.getUniformLocation(programAscii, "u_Contrast")
  const uGaussKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_GaussKernelSize");
  const uGaussWeightsLocation     = gl.getUniformLocation(programAscii, "u_GaussWeights");
  const uTexelSizeLocation        = gl.getUniformLocation(programAscii, "u_TexelSize");
  const uBloomIntensityLocation   = gl.getUniformLocation(programAscii, "u_BloomIntensity");
  const uBloomKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_BloomKernelSize");
  //============================================================================

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

          const [r,g,b,a] = rgbCreator('red-slider','green-slider','blue-slider');
          gl.uniform3f(uHaloColorLocation, r,g,b);
          gl.drawArrays(gl.TRIANGLES,0,6); 
          renderScene1Requested = false; 
        }
      }
    },
    scene2: {
      program: programAscii,
      render: function(time) {
        updateStats();
        if(renderScene2Requested){
          gl.useProgram(this.program);
          gl.viewport(0,0,canvas.width,canvas.height);
          gl.clearColor(0,0,0,1); //czarne tło
          gl.clear(gl.COLOR_BUFFER_BIT);

          gl.uniform2f(uTexelSizeLocation, (1.0/canvas.width), (1.0/canvas.height));

          // =================== BRIGHTNESS SHADER ===================

          const [brightness_val, shadows_val, midtones_val, highlights_val] = brightness('brightness-slider', 'shadows-slider', 'midtones-slider', 'highlights-slider');

          gl.uniform4f(uBrightnessLocation, brightness_val, shadows_val, midtones_val, highlights_val);

          // ===================== GAMMA SHADER ======================

          const [gamma_val] = gamma('gamma-slider');
          gl.uniform1f(uGammaLocation, parseFloat(gamma_val));

          // ==================== CONTRAST SHADER ====================

          const [contrast_val] = contrast('contrast-slider');
          gl.uniform1f(uContrastLocation, parseFloat(contrast_val));

          // ===================== BLOOM SHADER ======================

          const [bloomIntensity_val, bloomKernelSize_val] = bloom('bloom-intensity-slider', 'bloom-kernel-slider');
          gl.uniform1f(uBloomIntensityLocation, parseFloat(bloomIntensity_val));
          gl.uniform1i(uBloomKernelSizeLocation, bloomKernelSize_val);

          // ==================== GAUSSIAN SHADER ====================

          const [weights, gaussKernelSize] = gaussianBlur('gauss-kernel-slider', 'gauss-intensity-slider');
          gl.uniform1fv(uGaussWeightsLocation, weights);
          gl.uniform1i(uGaussKernelSizeLocation, gaussKernelSize);

          // ====================== SOBEL SHADER =====================

          const sobel_status = sobel('switch-sobel');
          gl.uniform1f(uSobelStatusLocation, sobel_status);

          // ===================== STARS GENERATOR ===================

          const points = starsCreator("sg-seed-slider", "sg-md-slider", "sg-k-slider");

          gl.uniform1fv(uArrayLocation, points);
          gl.uniform1i(uArraySizeLocation, points.length);
          gl.uniform2f(uResolution1Location, canvas.width, canvas.height);

          // =========================================================

          gl.uniform1fv

          gl.drawArrays(gl.TRIANGLES,0,6);
          renderScene2Requested = false;
        }
      }
    }
  }

  activeScene = 'scene2';

  function toggleScene() {
    renderScene1Requested = true;
    renderScene2Requested = true;
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

// ========================= Funkcje obsługi shaderów =========================
// (Pobieranie wartości z HTMLa)

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

function starsCreator(seed, minDistance, K){
  const seed_slider = document.getElementById(seed);
  const minDistance_slider = document.getElementById(minDistance);
  const K_slider = document.getElementById(K);

  const result = poissonDiskSampling(canvas.width, canvas.height, seed_slider.value, minDistance_slider.value, K_slider.value);

  return result;
}

function brightness(bright_handle, shadow_handle, midtone_handle, highlight_handle){
  const brighness_value  = parseFloat(document.getElementById(bright_handle).value);
  const shadows_value    = parseFloat(document.getElementById(shadow_handle).value);
  const midtones_value   = parseFloat(document.getElementById(midtone_handle).value);
  const highlights_value = parseFloat(document.getElementById(highlight_handle).value);

  const data = [brighness_value, shadows_value, midtones_value, highlights_value];
  return data;
}

function gamma(gamma_handle){
  const gamma_value = document.getElementById(gamma_handle).value;
  return [gamma_value];
}

function contrast(contrast_handler){
  const contrast_value = document.getElementById(contrast_handler).value;
  return [contrast_value];
}

function gaussian(x, sigma){
  return Math.exp(-(x*x)/(2*sigma*sigma));
}

function gaussianBlur(kernelSize_handler, intensity_handler){
  const kernelSize = document.getElementById(kernelSize_handler).value;
  const sigma = document.getElementById(intensity_handler).value;
  
  let weights = [];
  for(let i = 0; i <= kernelSize; i++){
    weights.push(gaussian(i, sigma));
  }
  
  return [weights, kernelSize];
}

function bloom(bloomIntensity_handler, bloomKernelSize_handler){
  const intensity = document.getElementById(bloomIntensity_handler).value;
  const kernelSize = document.getElementById(bloomKernelSize_handler).value;
  return [intensity, kernelSize];
}

function sobel(sobel_handler){
  const status = document.getElementById(sobel_handler);
  return status.checked ? 1.0 : 0.0;
}

function perlin(widthSliderId, heightSliderId, timeSliderId) {
  const width  = parseFloat(document.getElementById(widthSliderId).value);
  const height = parseFloat(document.getElementById(heightSliderId).value);
  const time   = parseFloat(document.getElementById(timeSliderId).value);

  return [width, height, time];
}

// ============================== Reszta Skryptów ==============================

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


// ==================== Podpiecia funkcji pod elementy HTML ====================
const import_btn = document.getElementById('import-btn'); //dostajemy się do elementu

import_btn.addEventListener('click', () => {
  loadJSON();
});

// =========================== Pobieranie pliku JSON ===========================
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
    renderScene2Requested = true;
  });
});

valueInputs.forEach((element, index) => {
  const sliderID = sliderInputs[index]; 
  const valueID = element;

  valueID.addEventListener('input', () => {
    restoreDefault(valueID);
    sliderValue(sliderID, valueID);
    inputValidation(valueID);
    renderScene2Requested = true;
  });
});

const buttonRenderScene1 = document.getElementById('render-scene1-button');
buttonRenderScene1.addEventListener('click', () => {
  renderScene1Requested = true;
});