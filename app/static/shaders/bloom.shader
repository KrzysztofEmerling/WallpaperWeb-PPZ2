#version 300 es
precision highp float;
precision highp int;

in vec2 v_TexCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform int kernelSize;
uniform float threshold;
uniform float bloomIntensity;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 sampleWithBlackBorder(sampler2D tex, vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec3(0.0);
    } else {
        return texture(tex, uv).rgb;
    }
}

void main() {
    vec3 baseColor = texture(uTexture, v_TexCoord).rgb;

    int k = kernelSize;
    if (k < 2) k = 2;
    if (k > 30) k = 30;

    vec2 texel = 1.0 / vec2(textureSize(uTexture, 0));
    float thr = threshold;
    if (thr <= 0.0) thr = 0.7;
    float intensity = bloomIntensity;
    if (intensity <= 0.0) intensity = 1.0;

    int half = k / 2;
    vec3 sum = vec3(0.0);
    int count = 0;

    for (int j = 0; j < 30; ++j) {
        if (j >= k) break;
        int y = j - half;
        for (int i = 0; i < 30; ++i) {
            if (i >= k) break;
            int x = i - half;

            vec2 offset = vec2(float(x), float(y)) * texel;
            vec2 uv = v_TexCoord + offset;

            vec3 sample = sampleWithBlackBorder(uTexture, uv);
            float l = luminance(sample);
            float brightFactor = max((l - thr) / (1.0 - thr), 0.0);
            vec3 brightSample = sample * brightFactor;

            sum += brightSample;
            count++;
        }
    }

    vec3 blur = (count > 0) ? (sum / float(count)) : vec3(0.0);
    vec3 finalColor = baseColor + blur * intensity;
    finalColor = clamp(finalColor, 0.0, 1.0);

    fragColor = vec4(finalColor, 1.0);
}
