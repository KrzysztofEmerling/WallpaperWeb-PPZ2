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

// Vertex shader (przekazuje pozycję)
const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  out vec2 v_TexCoord;

  void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_TexCoord = a_position * 0.5 + 0.5;
  }
`;

// Fragment shader (ustawia kolor pikseli na czerwony)
const fragmentShaderSource = `#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  uniform float u_Time;

  out vec4 fragColor;

  void main() {
    float r = (sin(u_Time * 0.0001) + 1.0) / 2.0;
    float g = (sin(u_Time * 0.0003) + 1.0) / 2.0;
    float b = (sin(u_Time * 0.0005) + 1.0) / 2.0;

    // pokazanie uniformów na zasadzie u_Time
    // fragColor = vec4(r, g, b, 1.0);

    // pokazanie przestrzeni teksturowej + animacja na kanale b
    fragColor =  vec4(v_TexCoord, b, 1.0);
  }
`;

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

// Funkcja do tworzenia programu shaderowego
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

// Znajdź wszystkie lokalizacje uniformów:
const uTimeLocation = gl.getUniformLocation(program, "u_Time");

// ...

// Narysuj na ekranie
function render(time) {
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 1); 
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // zaktualizuj uniformy
    gl.uniform1f(uTimeLocation, time);

    // ...

    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ======================================================================= Reszta Skryptow

function sliderValue(slider, input){
  const min = slider.min;
  const max = slider.max;

  let val = parseFloat(input.value);

  if (val < min) val = min;
  if (val > max) val = max;

  slider.value = val;
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
  sliderValue(slider3, value3);
  inputValidation(value3);
});