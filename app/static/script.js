import { poissonDiskSampling } from "./poisson.js";

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

// Tekstury dla sceny 2 (ASCII)
let sourceTexture = null;
let asciiAtlasTexture = null;
let lineAtlasTexture = null;
let lineMapTexture = null;

function createTextureFromImage(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

let activeScene = null;
let renderScene1Requested = true;
let renderScene2Requested = false;

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
  const fragmentAsciiShaderSource = await loadShaderSource('fragment_ascii.shader');

  // ZWRACAMY OBIEKT – tu musi być return { ... }
  return {
      vertexShaderSource,
      fragmentShaderSource,
      fragmentAsciiShaderSource
  };
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

  
    // ================== GŁÓWNA TEKSTURA (u_Texture) ==================
    const image = new Image();
    image.src = 'static/images/image.png';
    image.onload = () => {
      gl.activeTexture(gl.TEXTURE0);
      sourceTexture = createTextureFromImage(gl, image);
  
      // sampler u_Texture dla SCENY 1
      gl.useProgram(program);
      const uTextureLocationScene1 = gl.getUniformLocation(program, "u_Texture");
      if (uTextureLocationScene1) {
        gl.uniform1i(uTextureLocationScene1, 0);
      }
  
      // sampler u_Texture dla SCENY 2 (ASCII)
      gl.useProgram(programAscii);
      const uTextureLocationScene2 = gl.getUniformLocation(programAscii, "u_Texture");
      if (uTextureLocationScene2) {
        gl.uniform1i(uTextureLocationScene2, 0);
      }
  
      // pierwsze renderowanie sceny 2
      scenes.scene2.render(0);
      renderScene2Requested = true;
    };
  
    // ================== ATLAS ASCII (u_AsciiAtlas) ===================
    // ================== ATLAS ASCII (u_AsciiAtlas) – generowany z fontu ===================
(function() {
  // lista znaków od „najgęstszych” do „najrzadszych”
  const asciiChars = "@#%*+=-:. ";
  const numChars = asciiChars.length;

  // rozmiar siatki atlasu – musi zgadzać się z u_AsciiAtlasGrid (16x8)
  const gridCols = 16;
  const gridRows = 8;
  const cellW = 16;
  const cellH = 16;

  const atlasWidth = gridCols * cellW;   // 256
  const atlasHeight = gridRows * cellH;  // 128

  const canvasAtlas = document.createElement("canvas");
  canvasAtlas.width = atlasWidth;
  canvasAtlas.height = atlasHeight;
  const ctx = canvasAtlas.getContext("2d");

  // tło czarne
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, atlasWidth, atlasHeight);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "12px monospace";

  // rysujemy znaki po kolei w komórkach
  for (let i = 0; i < numChars; i++) {
    const ch = asciiChars[i];
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const x = col * cellW + cellW * 0.5;
    const y = row * cellH + cellH * 0.5;
    ctx.fillText(ch, x, y);
  }

  // tworzymy teksturę z canvasu
  gl.activeTexture(gl.TEXTURE1);
  asciiAtlasTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, asciiAtlasTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    canvasAtlas
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.useProgram(programAscii);
  const locSampler = gl.getUniformLocation(programAscii, "u_AsciiAtlas");
  if (locSampler) gl.uniform1i(locSampler, 1); // TEXTURE1

  // ustawiamy ile znaków faktycznie używamy
  const uNumAsciiCharsLocation = gl.getUniformLocation(programAscii, "u_NumAsciiChars");
  if (uNumAsciiCharsLocation) gl.uniform1i(uNumAsciiCharsLocation, numChars);
})();

  
    // ================== ATLAS LINII (u_LineAtlas) ====================
    // ================== ATLAS LINII (u_LineAtlas) – generowany z fontu ===================
(function() {
  const lineChars = "-/\\|"; // 4 znaki linii
  const gridCols = 4;
  const gridRows = 1;
  const cellW = 32;
  const cellH = 32;

  const atlasWidth = gridCols * cellW;   // 128
  const atlasHeight = gridRows * cellH;  // 32

  const canvasLines = document.createElement("canvas");
  canvasLines.width = atlasWidth;
  canvasLines.height = atlasHeight;
  const ctx = canvasLines.getContext("2d");

  // czarne tło
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, atlasWidth, atlasHeight);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "20px monospace";

  for (let i = 0; i < lineChars.length; i++) {
    const ch = lineChars[i];
    const col = i; // 0..3
    const row = 0;
    const x = col * cellW + cellW * 0.5;
    const y = row * cellH + cellH * 0.5;
    ctx.fillText(ch, x, y);
  }

  gl.activeTexture(gl.TEXTURE2);
  lineAtlasTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, lineAtlasTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    canvasLines
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.useProgram(programAscii);
  const locSampler = gl.getUniformLocation(programAscii, "u_LineAtlas");
  if (locSampler) gl.uniform1i(locSampler, 2); // TEXTURE2

  const uLineAtlasGridLocation = gl.getUniformLocation(programAscii, "u_LineAtlasGrid");
  if (uLineAtlasGridLocation) gl.uniform2i(uLineAtlasGridLocation, gridCols, gridRows);
})();

  
    // ================== MAPA LINII (u_LineMap) =======================
    // Na razie pusta 1x1 (brak linii) – możesz potem podpiąć prawdziwą
    gl.activeTexture(gl.TEXTURE3);
    lineMapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lineMapTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
    gl.useProgram(programAscii);
    {
      const loc = gl.getUniformLocation(programAscii, "u_LineMap");
      if (loc) gl.uniform1i(loc, 3);
    }
  

  // ========================== Podpinanie uniformów ===========================
  // ---- SCENA 1 (program) ----
  const uResolutionLocation       = gl.getUniformLocation(program, "u_Resolution");
  const uStepSizeLocation         = gl.getUniformLocation(program, "u_StepSize");
  const uHaloColorLocation        = gl.getUniformLocation(program, "u_HaloColor");

  // ---- SCENA 2 (programAscii – ASCII) ----
  const uArraySizeLocation        = gl.getUniformLocation(programAscii, "u_ArraySize");
  const uArrayLocation            = gl.getUniformLocation(programAscii, "u_Array");
  const uResolution1Location      = gl.getUniformLocation(programAscii, "u_Resolution");

  const uBrightnessLocation       = gl.getUniformLocation(programAscii, "u_Brightness");
  const uSobelStatusLocation      = gl.getUniformLocation(programAscii, "u_SobelStatus");
  const uGammaLocation            = gl.getUniformLocation(programAscii, "u_Gamma");
  const uContrastLocation         = gl.getUniformLocation(programAscii, "u_Contrast")
  const uGaussKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_GaussKernelSize");
  const uGaussWeightsLocation     = gl.getUniformLocation(programAscii, "u_GaussWeights");
  const uTexelSizeLocation        = gl.getUniformLocation(programAscii, "u_TexelSize");
  const uBloomIntensityLocation   = gl.getUniformLocation(programAscii, "u_BloomIntensity");
  const uBloomKernelSizeLocation  = gl.getUniformLocation(programAscii, "u_BloomKernelSize");

  // ---- ASCII specific uniforms (SCENA 2) ----
  const uCellCountLocation        = gl.getUniformLocation(programAscii, "u_CellCount");
  const uAsciiAtlasGridLocation   = gl.getUniformLocation(programAscii, "u_AsciiAtlasGrid");
  const uNumAsciiCharsLocation    = gl.getUniformLocation(programAscii, "u_NumAsciiChars");
  const uLineAtlasGridLocation    = gl.getUniformLocation(programAscii, "u_LineAtlasGrid");
  const uBackgroundColorLocation  = gl.getUniformLocation(programAscii, "u_BackgroundColor");
  const uLineThresholdLocation    = gl.getUniformLocation(programAscii, "u_LinePresenceThreshold");
  //============================================================================

  // // USTAWIENIA STARTOWE DLA SCENY 2 (ASCII)
  // gl.useProgram(programAscii);
  // if (uCellCountLocation)       gl.uniform2i(uCellCountLocation, 160, 90);    // ilość znaków (cols, rows)
  // if (uAsciiAtlasGridLocation)  gl.uniform2i(uAsciiAtlasGridLocation, 16, 8); // rozkład atlasu ASCII
  // if (uNumAsciiCharsLocation)   gl.uniform1i(uNumAsciiCharsLocation, 128);
  // if (uLineAtlasGridLocation)   gl.uniform2i(uLineAtlasGridLocation, 4, 1);   // 4 znaki linii w jednym rzędzie
  // if (uBackgroundColorLocation) gl.uniform4f(uBackgroundColorLocation, 0.0, 0.0, 0.0, 1.0);
  // if (uLineThresholdLocation)   gl.uniform1f(uLineThresholdLocation, 0.1);

  gl.useProgram(programAscii);

if (uCellCountLocation)       gl.uniform2i(uCellCountLocation, 160, 90);    // ilość znaków
if (uAsciiAtlasGridLocation)  gl.uniform2i(uAsciiAtlasGridLocation, 16, 8); // musi pasować do gridCols/gridRows z atlasu ASCII
// uNumAsciiChars ustawiamy w kodzie tworzącym atlas (patrz wyżej)
if (uLineAtlasGridLocation)   gl.uniform2i(uLineAtlasGridLocation, 4, 1);   // jak w atlasie linii
if (uBackgroundColorLocation) gl.uniform4f(uBackgroundColorLocation, 0.0, 0.0, 0.0, 1.0);
if (uLineThresholdLocation)   gl.uniform1f(uLineThresholdLocation, 0.1);



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