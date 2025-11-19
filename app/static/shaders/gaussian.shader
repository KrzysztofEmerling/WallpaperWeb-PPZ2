#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform int kernel_size;
uniform vec2 texelSize;

float gaussianWeight[6] = float[](
    0.06136, 0.24477, 0.38774, 0.24477, 0.06136, 0.0
);

void main() {
    vec3 original = texture(uTexture, v_TexCoord).rgb;
    vec3 blur = vec3(0.0);

    int k = kernel_size;

    for (int x = -k; x <= k; x++) {
        for (int y = -k; y <= k; y++) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            vec2 coord = v_TexCoord + offset;
            coord = clamp(coord, 0.0, 1.0);
            coord = 1.0 - abs(1.0 - coord * 2.0); 

            float w = gaussianWeight[abs(x)] * gaussianWeight[abs(y)];

            blur += texture(uTexture, coord).rgb * w;
        }
    }
    vec3 result = original - blur;
    result = result * 0.5 + 0.5;

    fragColor = vec4(result, 1.0);
}
