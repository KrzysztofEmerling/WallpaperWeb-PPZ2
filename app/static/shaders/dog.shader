#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;

  uniform sampler2D u_Texture;
  uniform vec2 u_TexelSize;

  const int MAX_KERNEL_SIZE = 5;
  uniform float u_GaussWeights[MAX_KERNEL_SIZE + 1];



  float gaussianWeight[6] = float[](
    0.06136, 0.24477, 0.38774, 0.24477, 0.06136, 0.0
  );


  vec4 dog() {
    vec3 original = texture(u_Texture, v_TexCoord).rgb;
    vec3 blur = vec3(0.0);

    int k = 5;

    for (int x = -k; x <= k; x++) {
      for (int y = -k; y <= k; y++) {
        vec2 offset = vec2(float(x), float(y)) * u_TexelSize;
        vec2 coord = v_TexCoord + offset;

        float w = gaussianWeight[abs(x)] * gaussianWeight[abs(y)];

        blur += texture(u_Texture, coord).rgb * w;
      }
    }

    float luminance = dot(original, vec3(0.299, 0.587, 0.114));  // konwersja na luminancję
    float blurLum = dot(blur, vec3(0.299, 0.587, 0.114));
    vec3 result = vec3(step(0.09, (luminance-blurLum) * 0.5 + 0.5));

    return vec4(result, 1.0);
  }


  void main() {
    FragColor = dog();
  }
