#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

uniform sampler2D u_Texture;
uniform float gamma;

void main() {
    vec3 color = texture(u_Texture, v_TexCoord).rgb;

    color = pow(color, vec3(1.0 / gamma));

    FragColor = vec4(color, 1.0);
}
