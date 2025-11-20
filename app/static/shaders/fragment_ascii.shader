#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  uniform sampler2D u_Texture;

  uniform float u_Brightness;
  uniform float u_Shadows;
  uniform float u_Midtones;
  uniform float u_Highlights;
  uniform vec2 u_TexelSize;

  out vec4 fragColor;

  vec4 brightnessControl(vec4 color) {
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

  //Funkcja pomocnicza: edge reflection - odbija pixele (rysuje ich odbicie lustrzane) przy krawedziach eliminujac tym artefakty
vec2 mirrorUV(vec2 uv) {
    uv = abs(uv);             // odbicie wartości < 0
    uv = 1.0 - abs(uv - 1.0); // odbicie wartości > 1
    return uv;
}

vec4 sobel(vec4 color) {
    //2 macierze Sobela dla prostopadłych do siebie kątów
    float k0[9] = float[9](
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
    );

    float k90[9] = float[9](
         1.0,  2.0,  1.0,
         0.0,  0.0,  0.0,
        -1.0, -2.0, -1.0
    );

    //Pobranie próbek 3x3 z edge reflection
    vec3 sampleTex[9];
    int idx = 0;
    for(int y=-1; y<=1; y++){
        for(int x=-1; x<=1; x++){ // petla w petli, iteracja po x, y czyli wspolrzednych pixela
            vec2 offset = v_TexCoord + vec2(float(x), float(y)) * u_TexelSize; // pobiera sasiednie probki dla naszej probki
            offset = mirrorUV(offset); // uzupelnienie krawedzi
            sampleTex[idx++] = texture(u_Texture, offset).rgb; // funkcja texture wbudowana w GLSL, texture().rgb wyciaga wartosci rgb, usuwajac tym samym kanal alfa
        }
    }

    //Obliczenie konwolucji dla dwóch macierzy w kolorze RGB
    vec3 conv0 = vec3(0.0); // vec3 tworzy wektor o 3 wartosciach, vec3(0.0) tworzy wektor o 3 wartosciach i wypelnia je zerami
    vec3 conv90 = vec3(0.0);

    for(int i=0; i<9; i++){ // sumujemy probki pomnozone przez odpowiadajace macierze sobela, wynik to wektor o 3 wartosciach (r, g, b)
        conv0  += sampleTex[i] * k0[i];
        conv90 += sampleTex[i] * k90[i];
    }

    //Suma dwóch konwolucji w kolorze RGB
    vec3 result = conv0 + conv90;

    //Opcjonalnie możesz znormalizować wartości do [0,1]
    result = clamp(result, 0.0, 1.0); //clamp przycina liczbe (result) do wartosci min, max (0.0, 1.0)

    return vec4(result, 1.0);
}

  void main() {
    fragColor = sobel(brightnessControl(texture(u_Texture, v_TexCoord)));
  }
