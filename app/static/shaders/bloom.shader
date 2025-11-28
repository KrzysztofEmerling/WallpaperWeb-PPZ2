#version 300 es
precision highp float;
precision highp int;

in vec2 v_TexCoord;
out vec4 FragColor;

uniform sampler2D u_Texture;
uniform float u_BloomIntensity;
// uniform float u_Kernel;
// uniform float threshold;


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
    FragColor = bloom();
}
