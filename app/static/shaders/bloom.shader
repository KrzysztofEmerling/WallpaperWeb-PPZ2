vec4 bloom(
    sampler2D tex,
    vec2 uv,
    vec2 resolution,
    float threshold,
    float intensity
) {
    const int SAMPLES = 5;
    const float weights[SAMPLES] = float[](
        0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216
    );

    vec4 originalColor = texture(tex, uv);
    vec4 brightColor = max(originalColor - threshold, 0.0);

    vec2 texelSize = 1.0 / resolution;

    vec4 blurredBloom = brightColor * weights[0];

    for(int i = 1; i < SAMPLES; ++i) {
        float offset = float(i);

        blurredBloom += texture(tex, uv + vec2(texelSize.x * offset, 0.0)) * weights[i];
        blurredBloom += texture(tex, uv - vec2(texelSize.x * offset, 0.0)) * weights[i];

        blurredBloom += texture(tex, uv + vec2(0.0, texelSize.y * offset)) * weights[i];
        blurredBloom += texture(tex, uv - vec2(0.0, texelSize.y * offset)) * weights[i];
    }

    vec3 finalColor = originalColor.rgb + blurredBloom.rgb * intensity;
    finalColor = finalColor / (finalColor + 1.0); // tonemapping

    return vec4(finalColor, 1.0);
} 
