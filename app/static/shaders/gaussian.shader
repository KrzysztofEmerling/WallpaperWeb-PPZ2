#version 300 es
// Gaussian idzie na koniec, pobiera inny input
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

uniform sampler2D u_Texture;
uniform int KernelSize;
uniform vec2 u_TexelSize;

float gaussianWeight[6] = float[](
    0.06136, 0.24477, 0.38774, 0.24477, 0.06136, 0.0
);

vec4 gaussian() {
    vec3 original = texture(u_Texture, v_TexCoord).rgb;
    vec3 blur = vec3(0.0);

    int k = KernelSize;

    for (int x = -k; x <= k; x++) {
        for (int y = -k; y <= k; y++) {
            vec2 offset = vec2(float(x), float(y)) * u_TexelSize;
            vec2 coord = v_TexCoord + offset;
            coord = clamp(coord, 0.0, 1.0);
            coord = 1.0 - abs(1.0 - coord * 2.0); 

            float w = gaussianWeight[abs(x)] * gaussianWeight[abs(y)];

            blur += texture(u_Texture, coord).rgb * w;
        }
    }
    vec3 result = original - blur;
    result = result * 0.5 + 0.5;

    return vec4(result, 1.0);
}

void main() {
    FragColor = gaussian();
}
