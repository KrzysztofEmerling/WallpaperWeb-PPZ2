#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;

  uniform float u_Contrast;


  vec4 applyContrast(vec4 color) {
    float scaling = 1.0 + u_Contrast;

    vec3 tempVec = vec3(color.rgb);
    // zmiana kontrastu out = (in - 0.5) * k + 0.5
    tempVec = (tempVec - 0.5) * scaling + 0.5;

    //żadna składowa koloru nie wyjdzie poza przedział [0, 1]
    tempVec = clamp(tempVec, 0.0, 1.0);

    return vec4(tempVec, color.a);
  }

  void main() {
    FragColor = applyContrast(texture(u_Texture, v_TexCoord));
  }
