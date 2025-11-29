#version 300 es
    precision mediump float;

    in vec2 v_TexCoord;
    out vec4 FragColor;
    uniform sampler2D u_Texture;

    uniform float u_Brightness;
    uniform float u_Shadows;
    uniform float u_Midtones;
    uniform float u_Highlights;

    vec4 brightness(vec4 color) {
        color.rgb *= u_Brightness;

        float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        float shadowMask     = 1.0 - smoothstep(0.0, 0.35, l);
        float midtoneMask    = smoothstep(0.20, 0.75, l) * (1.0 - smoothstep(0.75, 1.0, l));
        float highlightMask  = smoothstep(0.65, 1.0, l);

        color.rgb += shadowMask * (u_Shadows - 1.0);
        color.rgb += midtoneMask * (u_Midtones - 1.0);
        color.rgb += highlightMask * (u_Highlights - 1.0);

        color.rgb = clamp(color.rgb, 0.0, 1.0);

        return color;
    }

    void main() {
        FragColor = brightness(texture(u_Texture, v_TexCoord));
    }
