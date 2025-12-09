#version 300 es
precision highp float;

in vec2 v_TexCoord;
out vec4 fragColor;

uniform vec2 u_Resolution;
uniform float u_Time;

//Pseudo-losowe wartości
float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(vec3(
        p.x * p.y,
        p.y * p.z,
        p.z * p.x
        ) * (p.x + p.y + p.z));
}

vec3 vorornoiColor(vec3 id) {
    return hash3(id);
}

vec4 voronoi3d(vec3 p) {
    vec3 g = floor(p); // indeks (wektor całkowity) komórki punktu p
    vec3 f = fract(p); // lokalne współrzędne punktu w tej komórce

    float d1 = 1e20;
    float d2 = 1e20;
    vec3 id1 = vec3(0.0);

    for(int z=-1; z<=1; z++)
    for(int y=-1; y<=1; y++)
    for(int x=-1; x<=1; x++) {

        vec3 cell = g + vec3(x, y, z); // indeks rozważanej komórki
        vec3 jitter = hash3(cell); // pseudolosowe przesunięcie punktu wewnątrz tej komórki

        vec3 sp = vec3(x, y, z) + jitter; //pozycja punktu względem lokalnego układu f
        float dist = dot(f - sp, f - sp); //kwadrat odległości od punktu p(f) do tego punktu

        if(dist < d1) {
            d2 = d1;
            d1 = dist;
            id1 = cell;
        }
        else if(dist < d2) {
            d2 = dist;
        }
    }

    float edge = sqrt(d2) - sqrt(d1); //rzeczywista różnica odległości
    vec3 col = voronoiColor(id1);

    float border = smoothstep(0.045, 0.0, edge);
    vec3 finalColor = mix(col, vec3(0.0), border);

    return vec4(finalColor, 1.0);
}

void main() {

    vec2 uv = v_TexCoord.xy / u_Resolution.xy;

    float z = uTime * 0.3;
    vec3 pos = vec3(uv * 4.0, z);

    FragColor = voronoi3d(pos);
}