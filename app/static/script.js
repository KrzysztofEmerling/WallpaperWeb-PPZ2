const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext("webgl");

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

function render(time) {
    const r=Math.sin(time*0.001)*0.5+0.5;
    const g=Math.cos(time*0.001)*0.5+0.5;
    gl.clearColor(r,g,0.7,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    requestAnimationFrame(render);
}

// requestAnimationFrame(render);


// Vertex shader (przekazuje pozycję)
const vertexShaderSource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader (ustawia kolor pikseli na czerwony)
const fragmentShaderSource = `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1, 0, 0, 1); // czerwony
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

// Ustaw bufor współrzędnych prostokąta obejmującego cały ekran
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

// Narysuj na ekranie
gl.viewport(0, 0, canvas.width, canvas.height);
gl.clearColor(0, 0, 0, 1); // czarne tło
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLES, 0, 6);