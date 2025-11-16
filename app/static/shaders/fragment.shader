#version 300 es
precision highp float;

uniform vec2 u_Resolution;

out vec4 fragColor;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdCylinder(vec3 p, float r, float h) {
    return max(sqrt(p.x * p.x + p.z * p.z) - r, abs(p.y) - (h / 2.0));
}
// Zwraca najmniejszą odległość do obiektów w scenie (matemtyczna reprezentacja sceny)
float sceneSDF(vec3 p) {
    float bhole = sdSphere(p - vec3(0.4, -1.0, 4.0), 1.0);
    float nebula = sdCylinder(p - vec3(0.4, -1.0, 4.0), 1.8, 0.12);

    return min(bhole, nebula); 
    
}

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    const float MAX_DIST = 100.0;
    const float EPSILON = 0.001;
    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        if (d < EPSILON) return t;
        t += d;
        if (t > MAX_DIST) break;
    }
    return -1.0;
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

// Oświetlenie lambertowskie
vec3 lighting(vec3 p, vec3 n, vec3 lightDir) {
    float diff = max(dot(n, lightDir), 0.0);
    // kolor światła * ilość trafiającego do kamery
    return vec3(0.9, 0.9, 1.0) * diff;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_Resolution.xy) / u_Resolution.y;

    // Kamera
    vec3 ro = vec3(0.0, 0.0, 0.0); 
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0)); 

    // światło kierunkowe
    vec3 lightDir = normalize(vec3(-0.5, 1.0, -0.3));


    // Raymarching (spher casting)
    float t = raymarch(ro, rd);
    vec3 col;
    if (t > 0.0) { 
        vec3 p = ro + rd * t;
        vec3 n = estimateNormal(p);
        col = lighting(p, n, lightDir);
    } else {
        col = vec3(0.2, 0.2, 0.2); // tło
    }

    fragColor = vec4(col, 1.0);
}
