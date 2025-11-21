#version 300 es
precision highp float;

out vec4 FragColor;

uniform vec2 u_Resolution;
uniform float u_StepSize;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCylinder(vec3 p, float r, float h) {
    return max(sqrt(p.x * p.x + p.z * p.z) - r, abs(p.y) - (h / 2.0));
}

// Zwraca najmniejszą odległość do obiektów w scenie (matemtyczna reprezentacja sceny)
float sceneSDF(vec3 p) {
    float nebula = sdCylinder(p - vec3(0.4, -1.0, 12.0), 6.0, 0.125);
    return nebula;
}

float getbHoleMass(float r)
{
    // Mass = (c**2 * r) / (2 * G) gdzie G = 6.67 * 10**-11, c = 3 * 10 ** 8 pomniejszony o 10000000000000000000000000
    return(r * 90.0) / (1.334);
}

// Przybliżenie normalnej przez różniczkowanie
vec3 estimateNormal(vec3 p) {
    const vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
        sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
        sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
    ));
}

vec3 shade(vec3 p) {
    vec3 normal = estimateNormal(p);
    vec3 lightDir = normalize(vec3(-0.5, 1.0, -0.3));
    float diff = max(dot(normal, lightDir), 0.0);
    return vec3(0.5, 0.5, 0.7) * diff + vec3(0.2);
}

vec3 raymarch(vec3 ro, vec3 rd, vec3 bHoleCenter, float SchwarzschildRadious) {
    float bHoleMass = getbHoleMass(SchwarzschildRadious);
    float t = 0.0;
    const float MAX_DIST = 60.0;
    const float EPSILON = 0.001;
    int iter = int(floor(20.0 / u_StepSize));

    for (int i = 0; i < iter; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);

        if (d < EPSILON) {
            return shade(p);
        }

        // przekroczenie horyzontu zdarzeń
        vec3 toCenter = bHoleCenter - p;
        float distToCenter = length(toCenter);
        if (distToCenter < SchwarzschildRadious)
            return vec3(0.0);

        // zakrzywienie promienia
        vec3 dirToCenter = toCenter / distToCenter;
        float bendingStrength = bHoleMass / (distToCenter * distToCenter + 0.0001);
        rd = normalize(rd + bendingStrength * dirToCenter * 0.000025);

        t += u_StepSize;
        if (t > MAX_DIST) break;
    }

    // kolor tła
    return vec3(0.15);
}


void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_Resolution.xy) / u_Resolution.y;

    // Kamera
    vec3 ro = vec3(0.0, 0.0, 0.0); 
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0)); 

    vec3 col = raymarch(ro, rd, vec3(0.4, -1.0, 12.0), 0.6);;

    FragColor = vec4(col, 1.0);
}
