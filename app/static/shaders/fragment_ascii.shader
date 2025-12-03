#version 300 es
precision mediump float;

in vec2 v_TexCoord;
out vec4 FragColor;

// ============================================================================
// ISTNIEJĄCE UNIFORMY SCENY 2 
// ============================================================================

uniform sampler2D u_Texture;
uniform vec2      u_TexelSize;

// stars / sky generator – zostawione, ale nie używane
uniform int   u_ArraySize;
uniform float u_Array[1000];
uniform vec2  u_Resolution;

// brightness / levels – zostawione, ale nie używane
uniform vec4  u_Brightness;

// gamma / contrast – zostawione, ale nie używane
uniform float u_Gamma;
uniform float u_Contrast;

// gaussian blur – zostawione, ale nie używane
const int MAX_KERNEL_SIZE = 20;
uniform int   u_GaussKernelSize;
uniform float u_GaussWeights[MAX_KERNEL_SIZE + 1];

// bloom – zostawione, ale nie używane
uniform float u_BloomIntensity;
uniform int   u_BloomKernelSize;

// sobel – zostawione, ale nie używane
uniform float u_SobelStatus;

// ============================================================================
// ASCII – NOWE UNIFORMY
// ============================================================================

uniform sampler2D u_AsciiAtlas;   // atlas znaków ASCII
uniform sampler2D u_LineAtlas;    // atlas 4 znaków linii: -, /, \, |
uniform sampler2D u_LineMap;      // mapa linii (może być na razie pusta)

uniform vec4  u_BackgroundColor;  // kolor tła
uniform ivec2 u_CellCount;        // (cols, rows) – liczba znaków w poziomie/pionie

uniform ivec2 u_AsciiAtlasGrid;   // np. (16, 8) – 128 znaków
uniform int   u_NumAsciiChars;    // ile znaków z atlasu używamy

uniform ivec2 u_LineAtlasGrid;    // np. (4, 1)
uniform float u_LinePresenceThreshold; // próg wykrycia linii z u_LineMap (alpha)

// ============================================================================
// POMOCNICZE
// ============================================================================

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

vec2 getAtlasUv(ivec2 grid, int index, vec2 cellLocal) {
    int cols = grid.x;
    int rows = grid.y;

    int maxIndex = cols * rows - 1;
    index = clamp(index, 0, maxIndex);

    int row = index / cols;
    int col = index - row * cols;

    vec2 cellSize = 1.0 / vec2(grid);
    vec2 baseUv   = vec2(float(col), float(row)) * cellSize;

    return baseUv + cellLocal * cellSize;
}

// ============================================================================
// MAIN
// ============================================================================

void main() {
    // 1. Ustalenie komórki znakowej
    vec2 cellCoord  = v_TexCoord * vec2(u_CellCount);   // np. 160x90 komórek
    ivec2 cellIndex = ivec2(floor(cellCoord));
    vec2 cellLocal  = fract(cellCoord);                 // 0..1 wewnątrz komórki

    if (cellIndex.x < 0 || cellIndex.y < 0 ||
        cellIndex.x >= u_CellCount.x || cellIndex.y >= u_CellCount.y) {
        FragColor = u_BackgroundColor;
        return;
    }

    // 2. Kolor komórki – próbka z centrum
    vec2 cellCenterUv = (vec2(cellIndex) + 0.5) / vec2(u_CellCount);
    vec3 srcColor     = texture(u_Texture, cellCenterUv).rgb;

    // 3. Jasność -> indeks znaku ASCII
    float b = luminance(srcColor);
    float t = clamp(1.0 - b, 0.0, 1.0);     // 0 = jasne, 1 = ciemne

    int maxIdx     = max(u_NumAsciiChars - 1, 0);
    int asciiIndex = int(round(t * float(maxIdx)));

    // 4. Sprawdzenie mapy linii – nadpisanie znaku, jeśli jest linia
    vec4 lineSample = texture(u_LineMap, cellCenterUv);
    bool hasLine    = lineSample.a > u_LinePresenceThreshold;

    int glyphSource = 0;          // 0 = ascii, 1 = atlas linii
    int glyphIndex  = asciiIndex; // domyślnie zwykły znak

    if (hasLine) {
        glyphSource = 1;

        // Kodowanie typu linii w kanale R [0..1]:
        // 0 -> "-"
        // 1 -> "/"
        // 2 -> "\"
        // 3 -> "|"
        float r     = clamp(lineSample.r, 0.0, 0.9999);
        int lineIdx = int(floor(r * 4.0));   // 0..3
        glyphIndex  = lineIdx;
    }

    // 5. UV w atlasie
    vec2 atlasUv;
    if (glyphSource == 0) {
        atlasUv = getAtlasUv(u_AsciiAtlasGrid, glyphIndex, cellLocal);
    } else {
        atlasUv = getAtlasUv(u_LineAtlasGrid, glyphIndex, cellLocal);
    }

    // 6. Maska znaku – UWAGA: bez operatora trójargumentowego na samplerach
    float glyphMask;
    if (glyphSource == 0) {
        glyphMask = texture(u_AsciiAtlas, atlasUv).r;
    } else {
        glyphMask = texture(u_LineAtlas, atlasUv).r;
    }

    // 7. Mieszanie: tło + kolor komórki
    vec3 finalColor = mix(u_BackgroundColor.rgb, srcColor, glyphMask);

    FragColor = vec4(finalColor, 1.0);
}
