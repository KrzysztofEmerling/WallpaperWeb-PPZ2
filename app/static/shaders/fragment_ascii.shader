#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;
  uniform sampler2D u_Texture;

  uniform float u_Brightness;
  uniform float u_Shadows;
  uniform float u_Midtones;
  uniform float u_Highlights;
  uniform float gamma;
  uniform int KernelSize;

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
    color.rgb = pow(color.rgb, vec3(1.0 / gamma));
    return color;
}

// ============================== POSTPROCESSING ==============================
vec4 postProcessing(vec4 color)
{
// return złożenia wszystkich poza blur;
    color = gamma_corr(brightness(color));
    return color;
}

// ============================ DO SHADERA GAUSSIAN ============================
float gaussianWeight[6] = float[](
    0.06136, 0.24477, 0.38774, 0.24477, 0.06136, 0.0
);

vec4 gaussian() {
    vec3 original = postProcessing(texture(u_Texture, v_TexCoord)).rgb;
    vec3 blur = vec3(0.0);

    int k = KernelSize;

    for (int x = -k; x <= k; x++) {
        for (int y = -k; y <= k; y++) {
            vec2 offset = vec2(float(x), float(y)) * u_TexelSize;
            vec2 coord = v_TexCoord + offset;
            coord = clamp(coord, 0.0, 1.0);
            coord = 1.0 - abs(1.0 - coord * 2.0); 

            float w = gaussianWeight[abs(x)] * gaussianWeight[abs(y)];

            blur += postProcessing(texture(u_Texture, coord)).rgb * w;
        }
    }
    vec3 result = original - blur;
    result = result * 0.5 + 0.5;

    return vec4(result, 1.0);
}


  void main() {
    // FragColor = texture(u_Texture, v_TexCoord);
    // FragColor = brightness(texture(u_Texture, v_TexCoord));
    // FragColor = gamma_corr(texture(u_Texture, v_TexCoord));
    FragColor = gaussian();
  }
