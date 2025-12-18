#version 300 es
precision highp float;

uniform sampler2D u_Texture;   
uniform vec2 u_TexelSize;

in vec2 v_TexCoord;
out vec4 FragColor;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec3 c = texture(u_Texture, v_TexCoord).rgb;

    vec3 cx = texture(u_Texture, v_TexCoord + vec2(u_TexelSize.x, 0.0)).rgb;
    vec3 cy = texture(u_Texture, v_TexCoord + vec2(0.0, u_TexelSize.y)).rgb;
    float l  = luminance(c);
    float lx = luminance(cx);
    float ly = luminance(cy);

    //detekcja krawędzi
    float edge = abs(l - lx) + abs(l - ly);

    // delikatne wygładzenie tam, gdzie jest krawędź
    float w = clamp(edge * 3.0, 0.0, 1.0);
    vec3 aa = mix(c, (c + cx + cy) * 0.3333, w);

    FragColor = vec4(aa, 1.0);
}
