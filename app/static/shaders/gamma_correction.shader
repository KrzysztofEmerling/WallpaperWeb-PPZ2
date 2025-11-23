#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

uniform sampler2D u_Texture;
uniform float gamma;

vec4 gamma_corr(vec4 color) {
    color.rgb = pow(color.rgb, vec3(1.0 / gamma));
    return vec4(color, 1.0);
}

void main() {
    FragColor = gamma_corr(texture(u_Texture, v_TexCoord));
}
