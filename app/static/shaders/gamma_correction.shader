#version 300 es
precision mediump float;

uniform sampler2D tex;
uniform float gamma;

in vec2 TexCoord;
out vec4 FragColor;

void main() {
    vec3 color = texture(tex, TexCoord).rgb;

    color = pow(color, vec3(1.0 / gamma));

    FragColor = vec4(color, 1.0);
}
