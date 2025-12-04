#version 300 es
precision highp float;

uniform vec2 u_Resolution;
uniform float u_StepSize;
uniform vec3 u_HaloColor;
uniform int u_ArraySize;
uniform vec2 u_Array[1000]; 

out vec4 fragColor;
vec3 getBg(vec2 uv) {
    vec3 color = vec3(0.0);
    float radius = 0.005; 
    for (int i = 0; i < u_ArraySize; i++) {
        float isOutsideLimit = step(float(u_ArraySize), float(i)); 
        float isValid = 1.0 - isOutsideLimit;

        float dist = distance(uv, u_Array[i]);
        float star = smoothstep(radius, radius * 0.1, dist);
        color += vec3(star * isValid);
    }
    return min(color, vec3(1.0));
}

float sdSphere(vec3 p, float r) {
    return length(p) - r;
} 
float sdCylinder(vec3 p, float r, float h) {
    return max(sqrt(p.x * p.x + p.z * p.z) - r, abs(p.y) - (h / 2.0));
} 

// Zwraca najmniejszą odległość do obiektów w scenie (matemtyczna reprezentacja sceny) 
float sceneSDF(vec3 p) { 
    float nebula1 = sdCylinder(p - vec3(0.4, -1.0, 12.0), 1.2, 0.4);
    float nebula2 = sdCylinder(p - vec3(0.4, -1.0, 12.0), 4.0, 0.2);
    float nebula3 = sdCylinder(p - vec3(0.4, -1.0, 12.0), 6.0, 0.125);
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

vec3 raymarch(vec3 ro, vec3 rd, vec3 bHoleCenter, float SchwarzschildRadious) { 

    float bHoleMass = getbHoleMass(SchwarzschildRadious);
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
        if (distToCenter < SchwarzschildRadious) return vec3(0.0);

        // wolumetria: opisana SDF 
        if (d < 0.0) { 
            float localLight = 0.1 / max(distToCenter * distToCenter, 0.0001) * 5.0;
            float backLight  = clamp(dot(rd, -dirToCenter), 0.0, 1.0) * 1.0;

            float light = localLight + 0.25 * (0.5 + backLight);

            vec3 scatterColor = u_HaloColor * light; // referencyjnie vec3(0.8, 0.6, 1.0);
            float stepA = (1.0 - alpha) * 0.00065; //u_Density; //referencyjnie 0.00065;
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
        
        if(i == iter - 1) {
            return mix(getBg(cubemap(rd)), color, alpha);
        }
    }
        
    // zabezpieczenie
    return vec3(1.0, 0.0, 1.0);
    
} 

void main() { 
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_Resolution.xy) / u_Resolution.y;
    
    // Kamera
    vec3 ro = vec3(0.0, 0.0, 0.0);
    vec3 rd = normalize(vec3(uv.x, uv.y, 1.0));
    vec3 col = raymarch(ro, rd, vec3(0.4, -1.0, 12.0), 0.08);
    fragColor = vec4(col, 1.0); 
}