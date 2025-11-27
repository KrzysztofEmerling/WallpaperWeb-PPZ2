#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;
  uniform sampler2D u_Texture;

  uniform float u_Brightness;
  uniform float u_Shadows;
  uniform float u_Midtones;
  uniform float u_Highlights;
  uniform float u_Gamma;

  const int MAX_KERNEL_SIZE = 10;
  uniform int u_KernelSize;
  uniform float u_GaussianWeight[MAX_KERNEL_SIZE + 1];

  uniform vec2 u_TexelSize;

  // =========================== DO SHADERA BRIGHTNESS ===========================
  vec4 brightness(vec4 color) {
    color.rgb *= u_Brightness;

    float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    float shadowMask     = 1.0 - smoothstep(0.0, 0.35, l);
    float midtoneMask    = smoothstep(0.20, 0.75, l) * (1.0 - smoothstep(0.75, 1.0, l));
    float highlightMask  = smoothstep(0.65, 1.0, l);

    color.rgb += shadowMask * (u_Shadows - 1.0);
    color.rgb += midtoneMask * (u_Midtones - 1.0);
    color.rgb += highlightMask * (u_Highlights - 1.0);

    color.rgb = clamp(color.rgb, 0.0, 1.0);

    return color;
  }

  // ======================== DO SHADERA GAMMA CORRECTION ========================
  vec4 gamma_corr(vec4 color) {
    color.rgb = pow(color.rgb, vec3(1.0 / u_Gamma));
    return color;
  }

  // ============================ DO SHADERA GAUSSIAN ============================

  vec4 gaussian() {
    vec3 blur = vec3(0.0);
    float ws = 0.0;

    int k = u_KernelSize;

    for (int x = -MAX_KERNEL_SIZE; x <= MAX_KERNEL_SIZE; x++) {
      if(abs(x) > u_KernelSize) continue;
      float wx = u_GaussianWeight[abs(x)];

      for (int y = -MAX_KERNEL_SIZE; y <= MAX_KERNEL_SIZE; y++) {
        if(abs(y) > u_KernelSize) continue;
        float wy = u_GaussianWeight[abs(y)];
        float w = wx * wy;

        vec2 offset = vec2(float(x), float(y)) * u_TexelSize;
        vec2 coord = clamp(v_TexCoord + offset, 0.0, 1.0);

        blur += texture(u_Texture, coord).rgb * w;
        ws += w;
      }
    }

    blur /= ws;

    return vec4(blur, 1.0);
  }

  void main() {
    // FragColor = texture(u_Texture, v_TexCoord);
    // FragColor = brightness(texture(u_Texture, v_TexCoord));
    // FragColor = gamma_corr(texture(u_Texture, v_TexCoord));
    FragColor = gamma_corr(brightness(gaussian()));
  }
