#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  
  //uniform sampler2D u_Texture;

  //uniform float u_Brightness;
  //uniform float u_Shadows;
  //uniform float u_Midtones;
  //uniform float u_Highlights;
  uniform int u_ArraySize;
  uniform float u_Array[999];

  uniform vec2 u_Resolution;

  out vec4 fragColor;

  void main() {
    vec3 color = vec3(0.0, 0.0, 0.0);
    vec2 coords = vec2(v_TexCoord.x * u_Resolution.x, v_TexCoord.y * u_Resolution.y);
    for(int i = 0 ; i < u_ArraySize ; i += 2){
      color += step(length(coords - vec2(u_Array[i], u_Array[i+1])), 1.1);
    }
    color = clamp(color, 0.0, 1.0);
    fragColor = vec4(color, 1.0);
  }
