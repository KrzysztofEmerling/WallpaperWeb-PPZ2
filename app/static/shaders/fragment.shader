#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  uniform float u_Time;
  uniform vec4 u_Color;


  out vec4 fragColor;

  void main() {
    float r = (sin(u_Time * 0.0001) + 1.0) / 2.0;
    float g = (sin(u_Time * 0.0003) + 1.0) / 2.0;
    float b = (sin(u_Time * 0.0005) + 1.0) / 2.0;

    fragColor =  u_Color;

  }
