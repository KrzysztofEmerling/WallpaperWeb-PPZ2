#version 300 es
precision mediump float;

in vec2 v_TexCoord;

out vec4 FragColor;

uniform sampler2D u_Texture;
uniform vec2 u_TexelSize;

// ============================ STARS GENERATOR =============================

uniform int u_ArraySize;
uniform float u_Array[1000];
uniform vec2 u_Resolution;

vec4 poisson(vec4 color){
  vec3 result = color.rgb;
  vec2 coords = vec2(v_TexCoord.x * u_Resolution.x, v_TexCoord.y * u_Resolution.y);

  for(int i = 0 ; i < u_ArraySize ; i += 2){
    result += step(length(coords - vec2(u_Array[i], u_Array[i+1])), 1.0);
  }

  result = clamp(result, 0.0, 1.0);
  return vec4(result, 1.0);
}
  
// ============================ BRIGHTNESS SHADER ===========================

uniform vec4 u_Brightness;

vec4 brightness(vec4 color) {
  color.rgb *= u_Brightness[0];

  float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  float shadowMask     = 1.0 - smoothstep(0.0, 0.35, l);
  float midtoneMask    = smoothstep(0.20, 0.75, l) * (1.0 - smoothstep(0.75, 1.0, l));
  float highlightMask  = smoothstep(0.65, 1.0, l);

  color.rgb += shadowMask * (u_Brightness[1] - 1.0);
  color.rgb += midtoneMask * (u_Brightness[2] - 1.0);
  color.rgb += highlightMask * (u_Brightness[3] - 1.0);

  color.rgb = clamp(color.rgb, 0.0, 1.0);

  return color;
}

// ============================= GAMMA SHADER ===============================

uniform float u_Gamma;

vec4 gamma_corr(vec4 color) {
  color.rgb = pow(color.rgb, vec3(1.0 / u_Gamma));
  return color;
}

// =========================== CONTRAST SHADER ==============================

uniform float u_Contrast;

vec4 contrast(vec4 color) {
  float scaling = 1.0 + u_Contrast;

  vec3 tempVec = vec3(color.rgb);
  // zmiana kontrastu out = (in - 0.5) * k + 0.5
  tempVec = (tempVec - 0.5) * scaling + 0.5;

  //żadna składowa koloru nie wyjdzie poza przedział [0, 1]
  tempVec = clamp(tempVec, 0.0, 1.0);

  return vec4(tempVec, color.a);
}

// =========================== GAUSSIAN BLUR SHADER =========================

uniform int u_GaussKernelSize;
const int MAX_KERNEL_SIZE = 10;
uniform float u_GaussWeights[MAX_KERNEL_SIZE + 1];

vec4 gaussian() {
  vec3 blur = vec3(0.0);
  float ws = 0.0;

  int k = u_GaussKernelSize;

  for (int x = -MAX_KERNEL_SIZE; x <= MAX_KERNEL_SIZE; x++) {
    if(abs(x) > k) continue;
    float wx = u_GaussWeights[abs(x)];

    for (int y = -MAX_KERNEL_SIZE; y <= MAX_KERNEL_SIZE; y++) {
      if(abs(y) > k) continue;
      float wy = u_GaussWeights[abs(y)];
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

// ============================ BLOOM SHADER ================================

uniform float u_BloomIntensity;
uniform int u_BloomKernelSize;

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

vec4 bloom(vec4 color) {
  vec3 baseColor = vec3(color.rgb);

  int kernelSize = u_BloomKernelSize;

  vec2 texel = 1.0 / vec2(textureSize(u_Texture, 0));

  float thr = 0.7;

  float intensity = u_BloomIntensity;

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

  return vec4(clamp(finalColor, 0.0, 1.0), color.a);
}

// ============================ SOBEL SHADER ================================

uniform float u_SobelStatus;

vec2 mirrorUV(vec2 uv) {
  uv = abs(uv);            
  uv = 1.0 - abs(uv - 1.0); 
  return uv;
}

vec4 sobel(vec4 color) {
  float k0[9] = float[9](
      -1.0, 0.0, 1.0,
      -2.0, 0.0, 2.0,
      -1.0, 0.0, 1.0
  );

  float k90[9] = float[9](
      1.0,  2.0,  1.0,
      0.0,  0.0,  0.0,
      -1.0, -2.0, -1.0
  );

  vec3 sampleTex[9];
  int idx = 0;
  for(int y=-1; y<=1; y++){
      for(int x=-1; x<=1; x++){
          vec2 offset = v_TexCoord + vec2(float(x), float(y)) * u_TexelSize;
          offset = mirrorUV(offset);
          sampleTex[idx++] = texture(u_Texture, offset).rgb;
      }
  }

  vec3 conv0 = vec3(0.0);
  vec3 conv90 = vec3(0.0);

  for(int i=0; i<9; i++){
      conv0  += sampleTex[i] * k0[i];
      conv90 += sampleTex[i] * k90[i];
  }

  vec3 result = conv0 + conv90;

  result = clamp(result, 0.0, 1.0);

  return vec4(result, 1.0);
}

// ============================ SHADERS RESULT ================================

void main() {

  vec4 baseImage = bloom(contrast(gamma_corr(brightness(poisson(gaussian())))));
  
  FragColor = baseImage + sobel(baseImage) * u_SobelStatus;
  
}