import { poissonDiskSampling } from "./scripts/poisson.js";
import { createAtlas } from "./scripts/atlas.js";
import { createImage } from "./scripts/generator.js";

// =================================== WebGL ===================================

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");
const sceneAvailableShaders = {
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 1, zawiera id elementow z html
  scene1: ['steps', 'blackhole', 'rgb', 'sky-generator'],
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 2, zawiera id elementow z html
  scene2: ['brightness', 'gamma', 'contrast', 'gauss', 'sobel', 'bloom', 'asciiArt']
}
const scenesData = fetchSceneValues();
const defaultState = fetchSceneValues();

updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);

let activeScene           = null;
let renderScene1Requested = true;
let renderScene2Requested = false;
let sourceTexture         = null;
let sourceTexture1        = null;
let sourceTexture2        = null;
let sourceTexture3        = null;

// ============================= PERFORMENCE STATS =============================

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

// =============================================================================

if (!gl) {
    alert('Unable to initialize WebGL. Your browser may not support it.');
}

function resizeCanvas() {
    canvas.width  = window.innerWidth;
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
  const vertexShaderSource        = await loadShaderSource('vertex.shader');
  const fragmentShaderSource      = await loadShaderSource('fragment.shader');
  const fragmentAsciiShaderSource = await loadShaderSource('fragment_ascii.shader');

  return {
      vertexShaderSource,
      fragmentShaderSource,
      fragmentAsciiShaderSource
  };
}

function createTextureFromImage(gl, program, image, textureSlot, uniformName) {
    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0 + textureSlot);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uLocation = gl.getUniformLocation(program, uniformName);
    gl.uniform1i(uLocation, textureSlot);

    return texture;
}

(async () => {
  const {vertexShaderSource,
         fragmentShaderSource,
         fragmentAsciiShaderSource} = await init();

  // Kompilacja shaderów
  const vertexShader        = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader      = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const fragmentAsciiShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentAsciiShaderSource);

  // Tworzenie programów
  const program       = createProgram(gl, vertexShader, fragmentShader);
  const programAscii  = createProgram(gl, vertexShader, fragmentAsciiShader);
  gl.useProgram(program);

  // Ustawianie buforu współrzędnych prostokąta obejmującego cały canvas
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

  // Połączenie atrybutu pozycji z buforem
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const image = new Image();

  image.src = 'static/images/image.png';
  image.onload = () => {
    gl.useProgram(programAscii);
    sourceTexture = createTextureFromImage(gl, programAscii, image, 0, "u_Texture");
    scenes.scene2.render(0);
    renderScene2Requested = true;
  }

  gl.useProgram(programAscii);
  const charAtlas = createAtlas("@#%*+=-. ");
  sourceTexture1 = createTextureFromImage(gl, programAscii, charAtlas.image, 1, "u_CharAtlas");

  const lineAtlas = createAtlas("-/\\|");
  sourceTexture2 = createTextureFromImage(gl, programAscii, lineAtlas.image, 2, "u_LineAtlas");

  // ========================== Podpinanie uniformów ===========================
  const uResolutionLocation       = gl.getUniformLocation(program, "u_Resolution");
  const uStepSizeLocation         = gl.getUniformLocation(program, "u_StepSize");
  const uHaloColorLocation        = gl.getUniformLocation(program, "u_HaloColor");
  const uRadiusLocation           = gl.getUniformLocation(program, "u_Radius");
  const uTranslationLocation      = gl.getUniformLocation(program, "u_Translation");
  const uRotationLocation         = gl.getUniformLocation(program, "u_Rotation");
  // ===========================================================================
  const uAtlasSizeLocation        = gl.getUniformLocation(programAscii, "u_AtlasSize");
  const uBrightnessLocation       = gl.getUniformLocation(programAscii, "u_Brightness");
  const uSobelStatusLocation      = gl.getUniformLocation(programAscii, "u_SobelStatus");
  const uGammaLocation            = gl.getUniformLocation(programAscii, "u_Gamma");
  const uContrastLocation         = gl.getUniformLocation(programAscii, "u_Contrast")
  const uGaussKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_GaussKernelSize");
  const uGaussWeightsLocation     = gl.getUniformLocation(programAscii, "u_GaussWeights");
  const uTexelSizeLocation        = gl.getUniformLocation(programAscii, "u_TexelSize");
  const uBloomIntensityLocation   = gl.getUniformLocation(programAscii, "u_BloomIntensity");
  const uBloomKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_BloomKernelSize");
  const uColor1Location           = gl.getUniformLocation(programAscii, "u_Color1");
  const uColor2Location           = gl.getUniformLocation(programAscii, "u_Color2");
  const uAsciiFlagLocation        = gl.getUniformLocation(programAscii, "u_AsciiFlag");
  // ===========================================================================

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
          
          // ======================== STEP SIZE ======================

          const step_slider = vector1f('stepsize-slider') * 0.00005;
          gl.uniform1f(uStepSizeLocation, step_slider);

          // ========================= RADIUS ========================
          
          const radius_slider = vector1f('radius-slider') * 0.01;
          gl.uniform1f(uRadiusLocation, radius_slider);

          // ======================= HALO COLOR ======================

          const [r, g, b] = normalize(vector3f('red-slider','green-slider','blue-slider'));
          gl.uniform3f(uHaloColorLocation, r,g,b);

          // ======================= COORDINATES =====================

          const [x, y, z] = vector3f('x-slider','y-slider','z-slider');
          gl.uniform3f(uTranslationLocation, x, y, z);

          // ======================== ROTATION =======================

          const [rx, ry, rz] = vector3f('rot-x-slider','rot-y-slider','rot-z-slider');
          gl.uniform3f(uRotationLocation, rx, ry, rz);
          
          // ===================== STARS GENERATOR ===================

          const starSize = vector1i('sg-size-slider');
          const points = starsGenerator("sg-seed-slider", "sg-md-slider", "sg-k-slider");
          const skyTexture = createImage(points, canvas.width, canvas.height, starSize);
          sourceTexture3 = createTextureFromImage(gl, program, skyTexture, 3, "u_SkyTexture");

          // =========================================================

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

          const [brightness_val, shadows_val, midtones_val, highlights_val] = vector4f('brightness-slider', 'shadows-slider', 'midtones-slider', 'highlights-slider');

          gl.uniform4f(uBrightnessLocation, brightness_val, shadows_val, midtones_val, highlights_val);

          // ===================== GAMMA SHADER ======================

          const gamma_val = vector1f('gamma-slider');
          gl.uniform1f(uGammaLocation, gamma_val);

          // ==================== CONTRAST SHADER ====================

          const contrast_val = vector1f('contrast-slider');
          gl.uniform1f(uContrastLocation, contrast_val);

          // ===================== BLOOM SHADER ======================

          const [bloomIntensity_val, bloomKernelSize_val] = bloom('bloom-intensity-slider', 'bloom-kernel-slider');
          gl.uniform1f(uBloomIntensityLocation, bloomIntensity_val);
          gl.uniform1i(uBloomKernelSizeLocation, bloomKernelSize_val);

          // ==================== GAUSSIAN SHADER ====================

          const [weights, gaussKernelSize] = gaussianBlur('gauss-kernel-slider', 'gauss-intensity-slider');
          gl.uniform1fv(uGaussWeightsLocation, weights);
          gl.uniform1i(uGaussKernelSizeLocation, gaussKernelSize);

          // ====================== SOBEL SHADER =====================

          const sobel_status = isChecked('switch-sobel');
          gl.uniform1f(uSobelStatusLocation, sobel_status);

          // ======================= ASCII ART =======================
          
          gl.uniform1i(uAtlasSizeLocation, charAtlas.length);

          const [r1, g1, b1] = normalize(vector3f('color1-red-slider','color1-green-slider','color1-blue-slider'));
          const [r2, g2, b2] = normalize(vector3f('color2-red-slider','color2-green-slider','color2-blue-slider'));

          gl.uniform3f(uColor1Location, r1, g1, b1);
          gl.uniform3f(uColor2Location, r2, g2, b2);

          const asciiFlag = isChecked('switch-asciiArt');
          gl.uniform1f(uAsciiFlagLocation, asciiFlag);

          // =========================================================

          gl.drawArrays(gl.TRIANGLES,0,6);
          renderScene2Requested = false;
        }
      }
    }
  }

  activeScene = 'scene2';
  hideButton();

  function toggleScene() {
    if (activeScene === 'scene1') {
        renderScene2Requested = true;
        updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);
        activeScene = 'scene2';
        hideButton();
    } else {
        renderScene1Requested = true;
        updateSceneShaders(sceneAvailableShaders.scene1, sceneAvailableShaders.scene2);
        activeScene = 'scene1';
        hideButton();
    }
  }

  const switch_scene = document.getElementById('switch-scene');

  switch_scene.addEventListener('change', () => {
    toggleScene();
    updateSceneValues(scenesData, activeScene);
    setSceneValues(scenesData, activeScene);
  });

  function render(time){
    scenes[activeScene].render(time);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

})();

// ================================ WEKTORY INT ===============================

function vector1i(x_){
  const x = parseInt(document.getElementById(x_).value);

  return [x];
}

function vector2i(x_, y_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);

  return [x, y];
}

function vector3i(x_, y_, z_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);
  const z = parseInt(document.getElementById(z_).value);

  return [x, y, z];
}

function vector4i(x_, y_, z_, t_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);
  const z = parseInt(document.getElementById(z_).value);
  const t = parseInt(document.getElementById(t_).value);

  return [x, y, z, t];
}

// =============================== WEKTORY FLOAT ==============================

function vector1f(x_){
  const x = parseFloat(document.getElementById(x_).value);

  return [x];
}

function vector2f(x_, y_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);

  return [x, y];
}

function vector3f(x_, y_, z_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);
  const z = parseFloat(document.getElementById(z_).value);

  return [x, y, z];
}

function vector4f(x_, y_, z_, t_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);
  const z = parseFloat(document.getElementById(z_).value);
  const t = parseFloat(document.getElementById(t_).value);

  return [x, y, z, t];
}

// ========================= Funkcje obsługi shaderów =========================
// (Pobieranie wartości z HTMLa)

function normalize(array){
  return array.map(value => value / 255);
}

function starsGenerator(seed, minDistance, K){
  const [seed_value, minDistance_value, K_value] = vector3i(seed, minDistance, K);

  const result = poissonDiskSampling(canvas.width, canvas.height, seed_value, minDistance_value, K_value);

  return result;
}

function gaussian(x, sigma){
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

function gaussianBlur(kernelSize_handler, intensity_handler){
  const kernelSize = vector1i(kernelSize_handler)
  const sigma = vector1f(intensity_handler);
  
  let weights = [];
  for(let i = 0; i <= kernelSize; i++){
    weights.push(gaussian(i, sigma));
  }
  
  return [weights, kernelSize];
}

function bloom(bloomIntensity_handler, bloomKernelSize_handler){
  const intensity = vector1f(bloomIntensity_handler);
  const kernelSize = vector1i(bloomKernelSize_handler);
  return [intensity, kernelSize];
}

function isChecked(element){
  const status = document.getElementById(element);
  return status.checked ? 1.0 : 0.0;
}

function perlin(widthSliderId, heightSliderId, timeSliderId) {
  const [width, height, time] = vector3f(widthSliderId, heightSliderId, timeSliderId);

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
    const s1 = input.closest("#" + sceneAvailableShaders.scene1.join(", #"));
    const s2 = input.closest("#" + sceneAvailableShaders.scene2.join(", #"));

    if(s1){
      const id = s1.id;
      if(!values.scene1[id]) values.scene1[id] = {};
      values.scene1[id][input.id] = input.value;
    }

    if(s2) {
      const id = s2.id;
      if(!values.scene2[id]) values.scene2[id] = {};
      values.scene2[id][input.id] = input.value;
    }

  });

  return values;
}

function updateSceneValues(array, scene){
  const sliders = document.querySelectorAll('input.slider');

  sliders.forEach(input => {
    const s1 = input.closest("#" + sceneAvailableShaders.scene1.join(", #"));
    const s2 = input.closest("#" + sceneAvailableShaders.scene2.join(", #"));

    if(s1 && scene === 'scene1'){
      const id = s1.id;
      array[scene][id][input.id] = input.value;
    }

    if(s2 && scene === 'scene2'){
      const id = s2.id;
      array[scene][id][input.id] = input.value;
    }

  });
}

function setSceneValues(array, scene){
  const sliders = document.querySelectorAll('input.slider');

  sliders.forEach(input => {
    const s1 = input.closest("#" + sceneAvailableShaders.scene1.join(", #"));
    const s2 = input.closest("#" + sceneAvailableShaders.scene2.join(", #"));

    if(s1 && scene === 'scene1'){
      const id = s1.id;
      input.value = array[scene][id][input.id];
      input.dispatchEvent(new Event('input'));
    }

    if(s2 && scene === 'scene2'){
      const id = s2.id;
      input.value = array[scene][id][input.id];
      input.dispatchEvent(new Event('input'));
    } 

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

function hideButton(){
  document.getElementById('render-scene1-button').classList.toggle('disable');
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

const restore_btn = document.getElementById('default-btn');

restore_btn.addEventListener('click', () => {
  setSceneValues(defaultState, activeScene);
});

const sliderInputs  = document.querySelectorAll('input.slider');
const valueInputs   = document.querySelectorAll('input.single-value, input.multi-value');
const switchInputs  = document.querySelectorAll('input.switch');

switchInputs.forEach((element) => {
  element.addEventListener('click', () => {
    renderScene2Requested = true;
  })
});

sliderInputs.forEach((element, index) => {
  const sliderID = element;
  const valueID = valueInputs[index];

  sliderID.addEventListener('input', () => {
    inputValue(sliderID, valueID);
    // if (sliderID.closest("#" + sceneAvailableShaders.scene1.join(", #"))) setTimeout(() => { renderScene1Requested = true }, 2000);
    if (sliderID.closest("#" + sceneAvailableShaders.scene2.join(", #"))) renderScene2Requested = true;
  });
});

valueInputs.forEach((element, index) => {
  const sliderID = sliderInputs[index]; 
  const valueID = element;

  valueID.addEventListener('input', () => {
    restoreDefault(valueID);
    sliderValue(sliderID, valueID);
    inputValidation(valueID);
    // if (sliderID.closest("#" + sceneAvailableShaders.scene1.join(", #"))) setTimeout(() => { renderScene1Requested = true }, 2000);
    if (sliderID.closest("#" + sceneAvailableShaders.scene2.join(", #"))) renderScene2Requested = true;
  });
});

const buttonRenderScene1 = document.getElementById('render-scene1-button');
buttonRenderScene1.addEventListener('click', () => {
  renderScene1Requested = true;
});