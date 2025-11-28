#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  uniform float u_Time;
  uniform vec4 u_Color;
  uniform float u_Contrast;

  out vec4 fragColor;

  vec3 applyContrast(vec3 value, float contrast) {
    float k = 1.0 + contrast;
    value = (value - 0.5) * k + 0.5;  // zmiana kontrastu out = (in - 0.5) * k + 0.5
    return clamp(color, 0.0, 1.0);  //żadna składowa koloru nie wyjdzie poza przedział[0, 1]
  }

  void main() {

    color = applyContrast(color, u_Contrast)

    fragColor = vec4(color, u_Color.a);
  }