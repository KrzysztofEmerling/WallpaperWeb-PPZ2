#version 300 es
  precision mediump float;

  in vec2 v_TexCoord;
  out vec4 FragColor;

  uniform sampler2D u_Texture;
  uniform vec2 u_Resolution;
  uniform vec2 u_TexelSize;

  uniform int u_GaussKernelSize;
  const int MAX_KERNEL_SIZE = 5;
  uniform float u_GaussWeights[MAX_KERNEL_SIZE + 1];


// ============================= DO SHADERA SOBEL =============================
  //Funkcja pomocnicza: edge reflection - odbija pixele (rysuje ich odbicie lustrzane) przy krawedziach eliminujac tym artefakty
vec2 mirrorUV(vec2 uv) {
    uv = abs(uv);             // odbicie wartości < 0
    uv = 1.0 - abs(uv - 1.0); // odbicie wartości > 1
    return uv;
}

vec4 sobelSpecific(vec2 uv) {
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
            vec2 offset = vec2(float(x), float(y)) * u_TexelSize; // pobiera sasiednie probki dla naszej probki
            vec2 coords = uv + offset;
            coords = mirrorUV(coords); // uzupelnienie krawedzi
            sampleTex[idx++] = texture(u_Texture, coords).rgb; // funkcja texture wbudowana w GLSL, texture().rgb wyciaga wartosci rgb, usuwajac tym samym kanal alfa
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

// ============================ DO SHADERA GAUSSIAN ============================
float gaussianWeight[6] = float[](
    0.06136, 0.24477, 0.38774, 0.24477, 0.06136, 0.0
);


vec4 dogSpecific(vec2 uv) {
    vec3 original = texture(u_Texture, uv).rgb;
    vec3 blur = vec3(0.0);

    int k = 5;

    for (int x = -k; x <= k; x++) {
        for (int y = -k; y <= k; y++) {
            vec2 offset = vec2(float(x), float(y)) * u_TexelSize;
            vec2 coord = uv + offset;

            float w = gaussianWeight[abs(x)] * gaussianWeight[abs(y)];

            blur += texture(u_Texture, coord).rgb * w;
        }
    }

    float luminance = dot(original, vec3(0.299, 0.587, 0.114));  // konwersja na luminancję
    float blurLum = dot(blur, vec3(0.299, 0.587, 0.114));
    vec3 result = vec3(step(0.09, (luminance-blurLum) * 0.5 + 0.5));


    return vec4(result, 1.0);
}



// =========================== DO SHADERA LINESASCII ===========================

// Pobiera koordy piksela i zwraca kolor powstały po przemnożeniu koloru tego
// piksela po zastosowaniu na nim shadera sobel z kolorem po zastosowaniu diffofgaussian.
// Nasza funkcja skaluje linie w dół bez przerywania
vec4 lineInfo(vec2 coords) {
    vec4 pixSobel = sobelSpecific(coords);
    vec4 pixDog = dogSpecific(coords);

    return pixSobel*pixDog;
}

// Do szukania piksela z największą ilością koloru (wartością RGB)
float getColorScore(vec4 color) {
    return color.r + color.g + color.b;
}

vec4 linesASCII() {
    int blockSize = 8;

    // Znajdź lewy górny piksel bloku w UV space
    vec2 blockOriginUV = floor(v_TexCoord / (u_TexelSize * float(blockSize))) * u_TexelSize * float(blockSize);

    vec3 rgbCounter = vec3(0.0);

    for(int y = 0; y < blockSize; ++y) {
        for(int x = 0; x < blockSize; ++x) {
            vec2 offset = vec2(float(x), float(y)) * u_TexelSize;

            vec4 tempColor = lineInfo(blockOriginUV + offset);
            rgbCounter += vec3(step(tempColor.r, 0.5),
                               step(tempColor.g, 0.5),
                               step(tempColor.b, 0.5));
        }
    }

    float r = (rgbCounter.r > rgbCounter.g && rgbCounter.r > rgbCounter.b) ? 1.0 : 0.0;
    float g = (rgbCounter.g > rgbCounter.r && rgbCounter.g > rgbCounter.b) ? 1.0 : 0.0;
    float b = (rgbCounter.b > rgbCounter.r && rgbCounter.b > rgbCounter.g) ? 1.0 : 0.0;

    return vec4(r, g, b, 1.0);
}

void main() {
    FragColor = linesASCII();
    // FragColor = vec4(vec2(v_TexCoord), 0.0, 1.0);
    // FragColor = sobelSpecific(vec2(v_TexCoord)); // działa :-)
    // FragColor = gaussianSpecific(vec2(v_TexCoord)); // działa
    // FragColor = gaussianSpecific(vec2(v_TexCoord)) * sobelSpecific(vec2(v_TexCoord)); // działa
}
