#version 300 es
precision highp float;

in vec2 v_TexCoord;
out vec4 fragColor;

uniform vec2 u_Resolution;
uniform float u_Time;

// Funkcje pseudolosowe
float rand(float n){
    return fract(sin(n) * 43758.5453);
}
vec2 rand2(float n){
    return vec2(rand(n), rand(n+12.34));
}
vec3 randColor(float n) {
    return fract(sin(vec3(n + 1.0) * vec3(12.8787, 1.97, 20.73739)));
}

vec4 voronoi() {
    vec2 uv = v_TexCoord * u_Resolution;  // przeskaluje TexCoord do pikseli ekranu

    int points_length = 32;

    float dmin = 1e20;
    float point = 0.0;

    for (int i = 0; i < points_length; i++) {
        vec2 p = rand2(float(i));  //generuje pseudolosowe punkty w zakresie [0,1]
        //animacja
        p += vec2(sin(u_Time*0.5 + float(i)), cos(u_Time*0.3 + float(i)));
        p = fract(p);
        p *= u_Resolution; // przeskalowanie do pikseli

        float d = length(p - uv);  // odległość euklidesowa między aktualnym pikselem a punktem p
        if (d < dmin) {
            dmin = d;
            point = float(i);
        }
    }

    float edge = exp(-dmin * 0.02);
    vec3 color = randColor(punkt) * edge;

    return vec4(color, 1.0)
}

void main() {
    
    fragColor = voronoi();
}
