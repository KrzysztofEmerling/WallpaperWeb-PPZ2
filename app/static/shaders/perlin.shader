#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

uniform sampler2D u_Texture;

uniform vec2 u_PerlinScale;  // (width, height)
uniform float u_PerlinTime;  // time

vec2 perlinFade(vec2 t) {
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float perlinHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

    float perlinGrad(vec2 p, vec2 ip) {
        float rnd = perlinHash(ip);
        vec2 g = vec2(cos(rnd * 6.2831853), sin(rnd * 6.2831853));
        return dot(g, p - ip);
    }

    float perlinNoise(vec2 p) {
        vec2 ip = floor(p);
        vec2 fp = fract(p);

        float v00 = perlinGrad(fp, ip);
        float v10 = perlinGrad(fp, ip + vec2(1.0, 0.0));
        float v01 = perlinGrad(fp, ip + vec2(0.0, 1.0));
        float v11 = perlinGrad(fp, ip + vec2(1.0, 1.0));

        vec2 u = perlinFade(fp);
        float x1 = mix(v00, v10, u.x);
        float x2 = mix(v01, v11, u.x);
        float n = mix(x1, x2, u.y);

        return n; // [-1, 1]
    }
vec4 perlin(vec4 color){
  
        vec3 newcolor = color.rgb;
        vec2 scaledUV = v_TexCoord * u_PerlinScale + vec2(u_PerlinTime, u_PerlinTime);

        float n = 0.0;
        float amp = 0.5;
        float freq = 1.0;

        for (int i = 0; i < 4; i++) {
            n += perlinNoise(scaledUV * freq) * amp;
            freq *= 2.0;
            amp *= 0.5;
        }

        n = 0.5 + 0.5 * n;
        n = clamp(n, 0.0, 1.0);

        float strength = 0.4;

        vec3 noiseColor = vec3(n);

        newcolor = mix(newcolor.rgb, newcolor.rgb + noiseColor, strength);
    return vec4(newcolor, 1.0);
}

void main() {

    FragColor = perlin(texture(u_Texture, v_TexCoord));
}
