#version 300 es
    precision mediump float;

    in vec2 v_TexCoord;
    out vec4 FragColor;

    uniform sampler2D u_Texture;

    uniform float brightness;
    uniform float shadows;
    uniform float midtones;
    uniform float highlights;

    vec4 brightnessControl(vec4 color) {
        color.rgb *= brightness;

        float l = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        float shadowMask     = 1.0 - smoothstep(0.0, 0.35, l);
        float midtoneMask    = smoothstep(0.20, 0.75, l) * (1.0 - smoothstep(0.75, 1.0, l));
        float highlightMask  = smoothstep(0.65, 1.0, l);

        color.rgb += shadowMask * (shadows - 1.0);
        color.rgb += midtoneMask * (midtones - 1.0);
        color.rgb += highlightMask * (highlights - 1.0);

        color.rgb = clamp(color.rgb, 0.0, 1.0);

        return color;
    }

    void main() {
        FragColor = brightnessControl(texture(u_Texture, v_TexCoord));
    }
