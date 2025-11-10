// ======================================================================= WebGL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl2");

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

  return {vertexShaderSource, fragmentShaderSource}
}

(async () => {
  const { vertexShaderSource, fragmentShaderSource } = await init();

  // Kompiluj shadery
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  // Stwórz program i ustaw go
  const program = createProgram(gl, vertexShader, fragmentShader);
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
  // Narysuj na ekranie
  function render(time) {
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.clearColor(0, 0, 0, 1); 
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // zaktualizuj uniformy
      const [r, g, b, a] = rgbCreator('red-slider', 'green-slider', 'blue-slider');
      gl.uniform4f(uColorLocation, r, g, b, a);
      gl.uniform1f(uTimeLocation, time);

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

// ======================================================================= Podpiecia funkcji pod elementy HTML

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