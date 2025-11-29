#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

// tekstura wejściowa (oryginalna grafika)
uniform sampler2D u_Texture;

// suwaki Perlin
uniform vec2  u_PerlinScale;   // (width, height)
uniform float u_PerlinTime;    // time


// ----------------------------------------------------------
//           FUNKCJE POMOCNICZE PERLIN 3D
// ----------------------------------------------------------
vec3 quintic(vec3 t) {
    t = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    return t;
}

vec3 perlinFade(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float perlinHash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

vec3 perlinGradient(vec3 ip) {
    // losowy wektor na sferze jednostkowej
    float rnd  = perlinHash(ip);
    float a    = rnd * 6.2831853;               // kąt w płaszczyźnie XY
    float z    = fract(rnd * 17.0) * 2.0 - 1.0; // z w [-1, 1]
    float r    = sqrt(max(0.0, 1.0 - z * z));

    return vec3(r * cos(a), r * sin(a), z);
}

float perlinGrad(vec3 p, vec3 ip) {
    vec3 g = perlinGradient(ip);
    return dot(g, p - ip);
}

float perlinNoise3D(vec3 p) {
    vec3 ip = floor(p);
    vec3 fp = fract(p);

    float v000 = perlinGrad(p, ip + vec3(0.0, 0.0, 0.0));
    float v100 = perlinGrad(p, ip + vec3(1.0, 0.0, 0.0));
    float v010 = perlinGrad(p, ip + vec3(0.0, 1.0, 0.0));
    float v110 = perlinGrad(p, ip + vec3(1.0, 1.0, 0.0));
    float v001 = perlinGrad(p, ip + vec3(0.0, 0.0, 1.0));
    float v101 = perlinGrad(p, ip + vec3(1.0, 0.0, 1.0));
    float v011 = perlinGrad(p, ip + vec3(0.0, 1.0, 1.0));
    float v111 = perlinGrad(p, ip + vec3(1.0, 1.0, 1.0));

    vec3 u = perlinFade(fp);
    // vec3 u = quintic(perlinFade(fp));

    float x00 = mix(v000, v100, u.x);
    float x10 = mix(v010, v110, u.x);
    float x01 = mix(v001, v101, u.x);
    float x11 = mix(v011, v111, u.x);

    float y0  = mix(x00, x10, u.y);
    float y1  = mix(x01, x11, u.y);

    float n   = mix(y0, y1, u.z);  // [-1, 1]

    return n;
}


// ----------------------------------------------------------
//                  FUNKCJA PERLIN3D
// ----------------------------------------------------------
vec4 perlin3D(vec4 color) {

    vec3 newcolor = color.rgb;

    // pozycja w 3D: xy = UV * skala, z = czas (animacja)
    vec3 p = vec3(v_TexCoord * u_PerlinScale, u_PerlinTime);

    float n    = 0.0;
    float amp  = 0.5;
    float freq = 1.0;

    // 4 oktawy Perlin 3D
    for (int i = 0; i < 4; i++) {
        n    += perlinNoise3D(p * freq) * amp;
        freq *= 2.0;
        amp  *= 0.5;
    }
    //n = sign(n) * pow(abs(n), 0.7);
    // n jest w przybliżeniu w [-1, 1]
    n = clamp(n, -1.0, 1.0);

    float strength = 2.0;        
    vec3 noiseOffset = vec3(n) * strength;

    // delikatna zmiana jasności
    //newcolor = clamp(newcolor * (1.0 + n * strength), 0.0, 1.0);

    newcolor = clamp(newcolor + noiseOffset, 0.0, 1.0);

    return vec4(newcolor, 1.0);
}


// ----------------------------------------------------------
//                      MAIN
// ----------------------------------------------------------
void main() {
    FragColor = perlin3D(texture(u_Texture, v_TexCoord));
}
