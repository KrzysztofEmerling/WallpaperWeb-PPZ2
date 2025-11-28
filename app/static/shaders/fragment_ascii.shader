#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;

  uniform sampler2D u_Texture;
  uniform vec2 u_TexelSize;

  uniform float u_Brightness;
  uniform float u_Shadows;
  uniform float u_Midtones;
  uniform float u_Highlights;
  uniform float u_Gamma;
  uniform float u_Contrast;
  uniform float u_BloomIntensity;

  uniform int u_KernelSize;
  const int MAX_KERNEL_SIZE = 10;
  uniform float u_GaussianWeight[MAX_KERNEL_SIZE + 1];


  // ========================== DO SHADERA BRIGHTNESS ==========================
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

  // ======================= DO SHADERA GAMMA CORRECTION =======================
  vec4 gamma_corr(vec4 color) {
    color.rgb = pow(color.rgb, vec3(1.0 / u_Gamma));
    return color;
  }

  // =========================== DO SHADERA CONTRAST ===========================
  vec4 contrast(vec4 color) {
    float scaling = 1.0 + u_Contrast;

    vec3 tempVec = vec3(color.rgb);
    // zmiana kontrastu out = (in - 0.5) * k + 0.5
    tempVec = (tempVec - 0.5) * scaling + 0.5;

    //żadna składowa koloru nie wyjdzie poza przedział [0, 1]
    tempVec = clamp(tempVec, 0.0, 1.0);

    return vec4(tempVec, color.a);
  }

  // =========================== DO SHADERA GAUSSIAN ===========================
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

  // ============================ DO SHADERA BLOOM ============================
  float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  vec3 blackborder(sampler2D tex, vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      return vec3(0.0);
    } else {
      return texture(tex, uv).rgb;
    }
  }

  vec4 bloom() {
    vec3 baseColor = texture(u_Texture, v_TexCoord).rgb;

    // Fixed kernel size. Whatevs.
    int kernelSize = 8;

    // Można później usunąć jeśli inputy w HTMLu będą w sztywnych granicach
    // if (kernelSize < 2) kernelSize = 2;
    // if (kernelSize > 30) kernelSize = 30;

    vec2 texel = 1.0 / vec2(textureSize(u_Texture, 0));
    // Also fixed value
    float thr = 0.7;
    // if (thr <= 0.0) thr = 0.7;
    float intensity = u_BloomIntensity;
    // if (intensity <= 0.0) intensity = 1.0;

    int halfSize = kernelSize / 2;
    vec3 sum = vec3(0.0);
    int count = 0;

    for (int j = 0; j < 30; ++j) {
      if (j >= kernelSize) break;
      int y = j - halfSize;
      for (int i = 0; i < 30; ++i) {
        if (i >= kernelSize) break;
        int x = i - halfSize;

        vec2 offset = vec2(float(x), float(y)) * texel;
        vec2 uv = v_TexCoord + offset;
        
        vec3 texSample = blackborder(u_Texture, uv);
        
        float l = luminance(texSample);
        float brightFactor = max((l - thr) / (1.0 - thr), 0.0);
        vec3 brightSample = texSample * brightFactor;

        sum += brightSample;
        count++;
      }
    }

    vec3 blur = (count > 0) ? (sum / float(count)) : vec3(0.0);
    vec3 finalColor = baseColor + blur * intensity;

    return vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }

  void main() {
    // Szary ekran!
    // FragColor = bloom(contrast(gamma_corr(brightness(gaussian()))));
    FragColor = contrast(gamma_corr(brightness(gaussian())));
  }
