#version 300 es
precision highp float;

uniform vec2 u_Resolution;
uniform float u_StepSize;
// uniform float u_Density;
uniform vec3 u_HaloColor;
out vec4 fragColor;
uniform sampler2D u_SkyTexture;

uniform vec3 u_Position;
uniform vec3 u_Rotation;
uniform float u_Radius;

float u_PerlinTime = 23.2144;    // time
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
    float rnd  = perlinHash(ip);
    float a    = rnd * 6.2831853;               
    float z    = fract(rnd * 17.0) * 2.0 - 1.0;
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

    float x00 = mix(v000, v100, u.x);
    float x10 = mix(v010, v110, u.x);
    float x01 = mix(v001, v101, u.x);
    float x11 = mix(v011, v111, u.x);

    float y0  = mix(x00, x10, u.y);
    float y1  = mix(x01, x11, u.y);

    float n   = mix(y0, y1, u.z);

    return n;
}

mat3 rotationX(float angle) {
    angle = angle * 3.14159265359 / 180.0;
    float c = cos(angle);
    float s = sin(angle);

    return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
    );
}
mat3 rotationY(float angle) {
    angle = angle * 3.14159265359 / 180.0;
    float c = cos(angle);
    float s = sin(angle);

    return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
    );
}
float sdSphere(vec3 p, float r) {
    return length(p) - r;
} 
float sdCylinder(vec3 p, float r, float h) {
    return max(sqrt(p.x * p.x + p.z * p.z) - r, abs(p.y) - (h / 2.0));
} 

// Zwraca najmniejszą odległość do obiektów w scenie (matematyczna reprezentacja sceny) 
float sceneSDF(vec3 p) { 
    // translacja
    // p = p - u_Position;
    // p = rotationY(u_Rotation.x) * p;
    // p = rotationX(u_Rotation.y) * p;
    p = p - vec3(4.0, -1.0, 12.0);

    float nebula1 = sdCylinder(p, 2.0, 0.25);
    float nebula2 = sdCylinder(p, 5.0, 0.225);
    float nebula3 = sdCylinder(p, 7.0, 0.2);
    return min(nebula1, min(nebula2, nebula3));
} 
float getbHoleMass(float r) { // Mass = (c**2 * r) / (2 * G) gdzie G = 6.67 * 10**-11, c = 3 * 10 ** 8 pomniejszony o 10000000000000000000000000 
    return(r * 90.0) / (1.334);
} 


vec2 cubemap(vec3 rd) {
    vec3 d = normalize(rd);

    vec3 ad = abs(d);
    vec2 uv;

    if (ad.x >= ad.y && ad.x >= ad.z) {
        // X face
        if (d.x > 0.0) { uv = vec2(-d.z, -d.y) / ad.x; }
        else           { uv = vec2( d.z, -d.y) / ad.x; }
    }
    else if (ad.y >= ad.x && ad.y >= ad.z) {
        // Y face
        if (d.y > 0.0) { uv = vec2( d.x,  d.z) / ad.y; }
        else           { uv = vec2( d.x, -d.z) / ad.y; }
    }
    else {
        // Z face
        if (d.z > 0.0) { uv = vec2( d.x, -d.y) / ad.z; }
        else           { uv = vec2(-d.x, -d.y) / ad.z; }
    }

    uv = uv * 0.5 + 0.5;   // map to [0..1]
    return uv;
}
vec3 getBg(vec2 uv)
{
    return texture(u_SkyTexture, uv).rgb;
}

float falloff(float d, float r) {
    return clamp((0.5 * d - r) / r, 0.0, 1.0);
}

vec3 raymarch(vec3 ro, vec3 rd, vec3 bHoleCenter, float SchwarzschildRadius) { 

    float bHoleMass = getbHoleMass(SchwarzschildRadius);
    float t = 0.0;
    const float MAX_DIST = 60.0;
    const float EPSILON = 0.001;

    int iter = int(floor(20.0 / u_StepSize));

    float alpha = 0.0;

    
    vec3 color = vec3(0.0);
    for (int i = 0; i < iter; i++) { 
        vec3 p = ro + rd * t;
        float d = sceneSDF(p);
        
        // przekroczenie horyzontu zdarzeń
        vec3 toCenter = bHoleCenter - p; 
        float distToCenter = length(toCenter);
        vec3 dirToCenter = toCenter / distToCenter;
        if (distToCenter < SchwarzschildRadius) return vec3(0.0);

        // wolumetria: opisana SDF 
        if (d < 0.0) { 
            float localLight = 0.1 / max(distToCenter * distToCenter, 0.0001) * 5.0;
            float backLight  = clamp(dot(rd, -dirToCenter), 0.0, 1.0) * 1.0;

            float light = localLight + 0.75 * (0.6 + backLight) + 0.5;

            vec3 scatterColor = u_HaloColor * light; // referencyjnie vec3(0.8, 0.6, 1.0);
            float stepA = (1.0 - alpha) * (0.001 * mix(1.0, clamp(perlinNoise3D(p), 0.0, 1.0), falloff(distToCenter, SchwarzschildRadius)) + 0.0001); 
            color += scatterColor * stepA; 
            alpha += stepA;
            if (alpha >= 1.0) return color;
        }
        
        // zakrzywienie promienia vec3 
        float bendingStrength = bHoleMass / (distToCenter * distToCenter + 0.0001);
        rd = normalize(rd + bendingStrength * dirToCenter * 0.000025);
        t += u_StepSize;
        if (t > MAX_DIST)  {
                return mix(getBg(cubemap(rd)), color, alpha);
        } 
        if(i == iter - 1) return mix(getBg(cubemap(rd)), color, alpha);
    } 
        
    // zabezpieczenie
    return vec3(1.0, 0.0, 1.0);
} 

void main() { 
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_Resolution.xy) / u_Resolution.y;
    
    // Kamera
    vec3 ro = vec3(0.0, 0.0, 0.0);
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
    vec3 col = raymarch(ro, rd, vec3(4.0, -1.0, 12.0), u_Radius);
    fragColor = vec4(col, 1.0); 
}