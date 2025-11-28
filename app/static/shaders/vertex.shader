#version 300 es
  in vec2 a_position;
  out vec2 v_TexCoord;

  void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_TexCoord = a_position * 0.5 + 0.5; //transpozycja do wspołżędnych <0;1> z <-1;1>
  }