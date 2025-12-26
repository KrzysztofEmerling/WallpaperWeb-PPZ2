import { poissonDiskSampling } from "./scripts/poisson.js";
import { createAtlas } from "./scripts/atlas.js";
import { createImage } from "./scripts/generator.js";

// =================================== WebGL ===================================

/** Stała przechowująca obiekt canvasu. */
const canvas = document.getElementById('glcanvas');

/** Stała przechowująca kontekst webgl2. */
const gl = canvas.getContext("webgl2");

/** Stała przechowująca liste shaderów dla danej sceny. */
const sceneAvailableShaders = {
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 1, zawiera id elementow z html
  scene1: ['steps', 'blackhole', 'rgb', 'sky-generator'],
  // lista suwakow, ktore maja byc wyswietlane tylko dla sceny 2, zawiera id elementow z html
  scene2: ['brightness', 'gamma', 'contrast', 'gauss', 'sobel', 'bloom', 'asciiArt']
}

updateSceneShaders(sceneAvailableShaders.scene2, sceneAvailableShaders.scene1);

/** Zmienna przechowująca informacje o aktualnie wyświetlanej scenie. */
let activeScene           = null;

/** Flaga do obsługi renderowania sceny 1 na żądanie. */
let renderScene1Requested = true;

/** Flaga do obsługi renderowania sceny 2 na żądanie. */
let renderScene2Requested = false;

/** Tymczasowy pojemnik na załadowaną teksturę. */
let sourceTexture         = null;
let sourceTexture1        = null;
let sourceTexture2        = null;
let sourceTexture3        = null;

/** Flaga sprawdzająca czy w danych sesji jest zapisany stan aplikacji. */
const condition = (sessionStorage.getItem('scenesData') !== null);

/** Stała pomocnicza przechowująca stan aplikacji. */
const scenesData = condition ? JSON.parse(sessionStorage.getItem('scenesData')) : fetchSceneValues();

/** Stała pomocnicza przechowująca domyślny stan aplikacji. */
const defaultState = condition ? JSON.parse(sessionStorage.getItem('defaultState')) : fetchSceneValues();

// ============================= PERFORMENCE STATS =============================

/** Stała przechowująca wskaźnik na licznik FPS. */
const fpsCounter = document.getElementById('fps');

/** Stała przechowująca wskaźnik na licznik Frametime */
const frametimeCounter = document.getElementById('frametime');

let lastFrametime = performance.now();
let lastFps = performance.now();
let fpsFrames = 0;

let fps = 0;
let frametime = 0;

/** Funkcja wyliczająca FPS i Frametime na podstawie różnicy wydajności w poprzedniej i aktualnej klatce. */
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

/** Funkcja obsługująca automatyczne dostosowywanie rozmiaru canvasu do aktualnego rozmiaru okna przegladarki. */
function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderScene1Requested = true;
    renderScene2Requested = true;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/**
 * Tworzy i kompiluje shader WebGL.
 * @param {WebGL2RenderingContext} gl - Aktywny kontekst WebGL2.
 * @param {number} type - Typ shadera (`gl.VERTEX_SHADER` lub `gl.FRAGMENT_SHADER`).
 * @param {string} source - Kod źródłowy shadera w języku GLSL.
 * @returns {WebGLShader|null} - Skompilowany shader lub `null` w przypadku błędu kompilacji.
 */
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

/**
 * Tworzy i linkuje program WebGL z shaderów wierzchołków i fragmentów.
 * @param {WebGL2RenderingContext} gl - Aktywny kontekst WebGL2.
 * @param {WebGLShader} vertexShader - Skompilowany shader wierzchołków.
 * @param {WebGLShader} fragmentShader - Skompilowany shader fragmentów.
 * @returns {WebGLProgram|null} - Zlinkowany program WebGL lub `null` w przypadku błędu linkowania.
 */
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

/**
 * Asynchronicznie ładuje kod źródłowy shadera z pliku.
 * @param {string} name - Nazwa pliku shadera znajdującego się w katalogu `/static/shaders/`.
 * @returns {Promise<string>} - Kod źródłowy shadera w formacie tekstowym.
 * @throws {Error} - Gdy plik shadera nie może zostać załadowany.
 */
async function loadShaderSource(name) {
  const response = await fetch(`/static/shaders/${name}`);
  if (!response.ok) {
    throw new Error(`Nie udało się załadować shadera: ${name}`);
  }
  return await response.text();
}

/**
 * Asynchronicznie ładuje wszystkie shadery wykorzystywane w aplikacji.
 * @returns {Promise<{
 *   vertexShaderSource: string,
 *   fragmentShaderSource: string,
 *   fragmentAsciiShaderSource: string,
 *   fragmentFXAASource: string
 * }>} - Obiekt zawierający kody źródłowe wszystkich shaderów.
 */
async function init() {
  const vertexShaderSource        = await loadShaderSource('vertex.shader');
  const fragmentShaderSource      = await loadShaderSource('fragment.shader');
  const fragmentAsciiShaderSource = await loadShaderSource('fragment_ascii.shader');
  const fragmentFXAASource        = await loadShaderSource('fragment_fxaa.shader');


  return {
      vertexShaderSource,
      fragmentShaderSource,
      fragmentAsciiShaderSource,
      fragmentFXAASource
  };
}

/**
 * Funkcja tworząca teksturę 2D z wczytanego obrazu.
 * @param {WebGL2RenderingContext} gl - wskaźnik na kontekst gl.
 * @param {WebGLProgram} program - wskaźnik na program.
 * @param {TexImageSource} image - plik obrazu.
 * @param {number} textureSlot - wskaźnik na slot w który ładujemy teksturę.
 * @param {string} uniformName - nazwa uniformu pod który podpinamy teksturę.
 * @returns {WebGLTexture} - obiekt tekstury
 */
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

/**
 * Tworzy bufor ramki (Framebuffer) z teksturą jako celem renderowania.
 * @param {WebGL2RenderingContext} gl - Aktywny kontekst WebGL2.
 * @param {number} width - Szerokość tekstury render targetu w pikselach.
 * @param {number} height - Wysokość tekstury render targetu w pikselach.
 * @returns {{fbo: WebGLFramebuffer, tex: WebGLTexture}} - Obiekt zawierający framebuffer oraz powiązaną z nim teksturę.
 */
function createRenderTarget(gl, width, height) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { fbo, tex };
}


(async () => {
  /** Stała przechowująca wskaźniki na wczytane shadery. */
  const {vertexShaderSource,
         fragmentShaderSource,
         fragmentAsciiShaderSource,
         fragmentFXAASource} = await init();

  // Kompilacja shaderów.
  /** Stała przechowująca wskaźnik na skompilowany shader VERTEX. */
  const vertexShader        = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

  /** Stała przechowująca wskaźnik na skompilowany shader FRAGMENT dla sceny 1. */
  const fragmentShader      = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  /** Stała przechowująca wskaźnik na skompilowany shader FRAGMENT dla sceny 2. */
  const fragmentAsciiShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentAsciiShaderSource);
  const fragmentFXAAShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentFXAASource);

  /** Stała przechowująca wskaźnik na stworzony program dla sceny 1. */
  const program       = createProgram(gl, vertexShader, fragmentShader);

  /** Stała przechowująca wskaźnik na stworzony program dla sceny 2. */
  const programAscii  = createProgram(gl, vertexShader, fragmentAsciiShader);
  const programFXAA = createProgram(gl, vertexShader, fragmentFXAAShader);

  gl.useProgram(program);

  // Ustawianie buforu współrzędnych prostokąta obejmującego cały canvas
  /** Stała przechowująca bufor współrzędnych prostokąta. */
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  /** Stała przechowująca pozycje buffera. */
  const positions = [
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  /** Stała przechowująca połączenie atrybutu pozycji z buforem. */ 
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

  gl.useProgram(programFXAA)
  const uFXAATextureLocation  = gl.getUniformLocation(programFXAA, "u_Texture");
  const uFXAATexelSizeLocation = gl.getUniformLocation(programFXAA, "u_TexelSize");


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

  /** Stała przechowująca konfiguracje scen. */
  const scenes = {
    scene1: {
      program: program,
      render: function(time) {
        updateStats();
        if(renderScene1Requested)
        {
          let sceneTarget = createRenderTarget(gl, canvas.width, canvas.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.fbo);

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


          //FXAA:
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.useProgram(programFXAA);
          gl.viewport(0, 0, canvas.width, canvas.height);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, sceneTarget.tex);

          gl.uniform1i(uFXAATextureLocation, 0);
          gl.uniform2f(
            uFXAATexelSizeLocation,
            1.0 / canvas.width,
            1.0 / canvas.height
          );

          gl.drawArrays(gl.TRIANGLES, 0, 6);



          renderScene1Requested = false;
          updateSceneValues(scenesData, activeScene);
          saveSessionData();
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
          updateSceneValues(scenesData, activeScene);
          saveSessionData();
        }
      }
    }
  }

  activeScene = 'scene2';
  hideButton();
  setSceneValues(scenesData, activeScene);

  /** Funkcja obsługująca zmiane sceny. */
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
    setSceneValues(scenesData, activeScene);
    updateSceneValues(scenesData, activeScene);
  });

  const lang_change = document.getElementById('lang-change');

  lang_change.addEventListener('click', () => {
    updateSceneValues(scenesData, activeScene);
    saveSessionData();
  });

  /* Funkcja pominięta w dokumentacji. */
  function render(time) {
    scenes[activeScene].render(time);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

})();

// ================================ WEKTORY INT ===============================

/** 
 * Funkcja tworząca jednowymiarowy wektor INT.
 * @param {int} x_ - wartość x 
 * @returns wektor jednowymiarowy w formie listy [x]
 */
function vector1i(x_){
  const x = parseInt(document.getElementById(x_).value);

  return [x];
}

/** 
 * Funkcja tworząca dwuwymiarowy wektor INT.
 * @param {int} x_ - wartość x 
 * @param {int} y_ - wartość y
 * @returns wektor dwuwymiarowy w formie listy [x, y]
 */
function vector2i(x_, y_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);

  return [x, y];
}

/** 
 * Funkcja tworząca trójwymiarowy wektor INT.
 * @param {int} x_ - wartość x 
 * @param {int} y_ - wartość y
 * @param {int} z_ - wartość z
 * @returns wektor trójwymiarowy w formie listy [x, y, z]
 */
function vector3i(x_, y_, z_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);
  const z = parseInt(document.getElementById(z_).value);

  return [x, y, z];
}

/** 
 * Funkcja tworząca czterowymiarowy wektor INT.
 * @param {int} x_ - wartość x 
 * @param {int} y_ - wartość y
 * @param {int} z_ - wartość z
 * @param {int} t_ - wartość t
 * @returns wektor czterowymiarowy w formie listy [x, y, z, t]
 */
function vector4i(x_, y_, z_, t_){
  const x = parseInt(document.getElementById(x_).value);
  const y = parseInt(document.getElementById(y_).value);
  const z = parseInt(document.getElementById(z_).value);
  const t = parseInt(document.getElementById(t_).value);

  return [x, y, z, t];
}

// =============================== WEKTORY FLOAT ==============================

/** 
 * Funkcja tworząca jednowymiarowy wektor FLOAT.
 * @param {float} x_ - wartość x 
 * @returns wektor jednowymiarowy w formie listy [x]
 */
function vector1f(x_){
  const x = parseFloat(document.getElementById(x_).value);

  return [x];
}

/** 
 * Funkcja tworząca dwuwymiarowy wektor FLOAT.
 * @param {float} x_ - wartość x 
 * @param {float} y_ - wartość y
 * @returns wektor dwuwymiarowy w formie listy [x, y]
 */
function vector2f(x_, y_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);

  return [x, y];
}

/** 
 * Funkcja tworząca trójwymiarowy wektor FLOAT.
 * @param {float} x_ - wartość x 
 * @param {float} y_ - wartość y
 * @param {float} z_ - wartość z
 * @returns wektor trójwymiarowy w formie listy [x, y, z]
 */
function vector3f(x_, y_, z_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);
  const z = parseFloat(document.getElementById(z_).value);

  return [x, y, z];
}

/** 
 * Funkcja tworząca czterowymiarowy wektor FLOAT.
 * @param {float} x_ - wartość x 
 * @param {float} y_ - wartość y
 * @param {float} z_ - wartość z
 * @param {float} t_ - wartość t
 * @returns wektor czterowymiarowy w formie listy [x, y, z, t]
 */
function vector4f(x_, y_, z_, t_){
  const x = parseFloat(document.getElementById(x_).value);
  const y = parseFloat(document.getElementById(y_).value);
  const z = parseFloat(document.getElementById(z_).value);
  const t = parseFloat(document.getElementById(t_).value);

  return [x, y, z, t];
}

// ========================= Funkcje obsługi shaderów =========================
// (Pobieranie wartości z HTMLa)

/**
 * Funkcja normalizująca każdą wartość w liście do zakresu [0, 1].
 * @param {list} array - tablica
 * @returns znormalizowana tablica.
 */
function normalize(array){
  return array.map(value => value / 255);
}

/**
 * Funkcja obsługująca pobieranie wartości do generatora gwiazd.
 * @param {int} seed - ziarno
 * @param {int} minDistance - minimalna odleglość pomiędzy dwoma punktami
 * @param {int} K - ilość prób podjęta do znalezienia pasującego punktu
 * @returns wypłaszczony wektor zawierający współrzędne gwiazd [x1, y1, x2, y2, ..., xn, yn].
 */
function starsGenerator(seed, minDistance, K){
  const [seed_value, minDistance_value, K_value] = vector3i(seed, minDistance, K);

  const result = poissonDiskSampling(canvas.width, canvas.height, seed_value, minDistance_value, K_value);

  return result;
}

/**
 * Funkcja pomocnicza do wyznaczania wartości jednowymiarowej funkcji Gaussa.
 * @param {int} x - wartość
 * @param {float} sigma - rozmycie sigma
 * @returns wartość funkcji Gaussa.
 */
function gaussian(x, sigma){
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

/**
 * Funkcja obsługująca pobieranie wartości do shadera Gaussian Blur.
 * @param {int} kernelSize_handler - wielkość kernela
 * @param {float} intensity_handler - intensywność efektu
 * @returns gotowe wartości dla shadera.
 */
function gaussianBlur(kernelSize_handler, intensity_handler){
  const kernelSize = vector1i(kernelSize_handler)
  const sigma = vector1f(intensity_handler);
  
  let weights = [];
  for(let i = 0; i <= kernelSize; i++){
    weights.push(gaussian(i, sigma));
  }
  
  return [weights, kernelSize];
}

/**
 * Funkcja obsługująca pobieranie wartości do shadera Bloom.
 * @param {float} bloomIntensity_handler - intensywność efektu
 * @param {int} bloomKernelSize_handler - wielkość kernela
 * @returns gotowe wartości dla shadera.
 */
function bloom(bloomIntensity_handler, bloomKernelSize_handler){
  const intensity = vector1f(bloomIntensity_handler);
  const kernelSize = vector1i(bloomKernelSize_handler);
  return [intensity, kernelSize];
}

/**
 * Sprawdza czy przycisk jest wciśnięty.
 * @param {object} element - obiekt DOM
 * @returns boolean true/false.
 */
function isChecked(element){
  const status = document.getElementById(element);
  return status.checked ? 1.0 : 0.0;
}

// ============================== Reszta Skryptów ==============================

/**
 * Funkcja pilnująca by wprowadzana wartość nie wchodziła poza zakres <min, max>.
 * @param {object} slider - - input type Range
 * @param {object} input - input type Number
 */
function sliderValue(slider, input){
  const min = slider.min;
  const max = slider.max;

  let val = parseFloat(input.value);

  if (val < min) val = min;
  if (val > max) val = max;

  slider.value = val;
}

/**
 * Funkcja ustawiająca wartość na minimum jeżeli zostanie całkowicie usunięta z text area.
 * @param {object} input - input type Number
 */
function restoreDefault(input){
  if (input.value === ''){
    input.value = input.min;
  }
}

/**
 * Funkcja ustawiający input.value takie samo jak w sliderze.
 * @param {object} slider - input type Range
 * @param {object} input - input type Number
 */
function inputValue(slider, input){
  input.value = slider.value;
}

/**
 * Funkcja pilnująca żeby w inpucie nie można było przekroczyć wartości minimalnej i maksymalnej.
 * @param {object} input - input type Number
 */
function inputValidation(input){
  const min = input.min;
  const max = input.max;

  let val = parseFloat(input.value);

  if (val < min) val = min;
  if (val > max) val = max;

  input.value = val;
}

/** Funkcja zapisująca dane sesji. */
function saveSessionData(){
  sessionStorage.setItem('scenesData', JSON.stringify(scenesData));
  sessionStorage.setItem('defaultState', JSON.stringify(defaultState));
}

/**
 * Funkcja pobierająca aktualne wartości w danej scenie.
 * @returns array
 */
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

/**
 * Funkcja aktualizująca wartości w tablicy dla podanej sceny.
 * @param {dict} array - tablica z wartościami
 * @param {string} scene - wskaźnik na aktywną scene
 */
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

/**
 * Funkcja ustawiająca wartości dla podanej sceny.
 * @param {dict} array - tablica z wartościami
 * @param {string} scene - wskaźnik na aktywną scene
 */
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

/**
 * Ukrywa shadery niedostępne w wybranej scenie.
 * @param {list} scene1 - tablica zawierająca liste shaderów dostępnych na scenie 1
 * @param {list} scene2 - tablica zawierająca liste shaderów dostępnych na scenie 2
 */
function updateSceneShaders(scene1, scene2){
  scene2.forEach(id => {
    document.getElementById(id).classList.add('remove');
  });

  scene1.forEach(id => {
    document.getElementById(id).classList.remove('remove');
  });
}

/** Ukrywa przycisk do renderowania sceny 1 */
function hideButton(){
  document.getElementById('render-scene1-button').classList.toggle('disable');
}

/** Tworzy plik JSON i zapisuje do niego ustawienia aplikacji. */
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

/**
 * Funkcja wczytuje plik JSON i odczytuje zapisane w nim ustawienia aplikacji.
 * @returns sparsowany plik JSON.
 */
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

/** Obsługa przycisku importu ustawień. */
import_btn.addEventListener('click', () => {
  loadJSON();
});

// =========================== Pobieranie pliku JSON ===========================
const export_btn = document.getElementById('export-btn');

/** Obsługa przycisku eksportu ustawień. */
export_btn.addEventListener('click', () => {
  createJSON();
});

const restore_btn = document.getElementById('default-btn');

/** Obsługa przycisku przywracającego ustawienia domyślne dla całej aplikacji. */
restore_btn.addEventListener('click', () => {
  setSceneValues(defaultState, activeScene);
});

const sliderInputs  = document.querySelectorAll('input.slider');
const valueInputs   = document.querySelectorAll('input.single-value, input.multi-value');
const switchInputs  = document.querySelectorAll('input.switch');

/** Obsługa przycisków ON/OFF. */
switchInputs.forEach((element) => {
  element.addEventListener('click', () => {
    renderScene2Requested = true;
  })
});

/** Obsługa inputów typu Range. */
sliderInputs.forEach((element, index) => {
  const sliderID = element;
  const valueID = valueInputs[index];

  sliderID.addEventListener('input', () => {
    inputValue(sliderID, valueID);
    // if (sliderID.closest("#" + sceneAvailableShaders.scene1.join(", #"))) setTimeout(() => { renderScene1Requested = true }, 2000);
    if (sliderID.closest("#" + sceneAvailableShaders.scene2.join(", #"))) renderScene2Requested = true;
  });
});

/** Obsługa inputów typu Number. */
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
/** Obsługa zmiany sceny */
buttonRenderScene1.addEventListener('click', () => {
  renderScene1Requested = true;
  updateSceneValues(scenesData, activeScene);
  saveSessionData();
});

const restoreButtons          = document.querySelectorAll('button.restore');
const subRestoreButtons       = document.querySelectorAll('button.sub-restore');
const singleRestoreButtons    = document.querySelectorAll('button.single-restore');
const subSingleRestoreButtons = document.querySelectorAll('button.sub-single-restore');

/** Obsługa logiki przywracania wartości domyślnych dla przycisków z klasy restore */
restoreButtons.forEach(button => {
  const parent = button.closest('.mb-1');
  const parentID = parent.id;
  const sliders = parent.querySelectorAll('input.slider');
  
  button.addEventListener('click', () => {
    sliders.forEach(input => {
      input.value = defaultState[activeScene][parentID][input.id];
      input.dispatchEvent(new Event('input'));
      updateSceneValues(scenesData, activeScene);
      saveSessionData();
    });
  });
});

/** Obsługa logiki przywracania wartości domyślnych dla przycisków z klasy sub-restore */
subRestoreButtons.forEach(button => {
  const parent = button.closest('.mb-1');
  const secondParent = parent.closest('.main');
  const secondParentID = secondParent.id;
  const sliders = parent.querySelectorAll('input.slider');
  
  button.addEventListener('click', () => {
    sliders.forEach(input => {
      input.value = defaultState[activeScene][secondParentID][input.id];
      input.dispatchEvent(new Event('input'));
      updateSceneValues(scenesData, activeScene);
      saveSessionData();
    });
  });
});

/** Obsługa logiki przywracania wartości domyślnych dla przycisków z klasy single-restore */
singleRestoreButtons.forEach(button => {
  const parent = button.closest('.mb-1');
  const parentID = parent.id;
  const container = button.closest('.d-flex');
  const input = container.querySelector('input.slider');
  
  button.addEventListener('click', () => {
    input.value = defaultState[activeScene][parentID][input.id];
    input.dispatchEvent(new Event('input'));
    updateSceneValues(scenesData, activeScene);
    saveSessionData();
  });
});

/** Obsługa logiki przywracania wartości domyślnych dla przycisków z klasy sub-single-restore */
subSingleRestoreButtons.forEach(button => {
  const parent = button.closest('.mb-1');
  const secondParent = parent.closest('.main');
  const secondParentID = secondParent.id;
  const container = button.closest('.d-flex');
  const input = container.querySelector('input.slider');
  
  button.addEventListener('click', () => {
    input.value = defaultState[activeScene][secondParentID][input.id];
    input.dispatchEvent(new Event('input'));
    updateSceneValues(scenesData, activeScene);
    saveSessionData();
  });
});