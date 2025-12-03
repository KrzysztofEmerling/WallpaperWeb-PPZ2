export function createAtlas(chars, font = "32px arial"){
  const array = chars.split("");
  const image = document.createElement("canvas");
  const ctx = image.getContext("2d");
  const length = array.length

  const cols = Math.ceil(Math.sqrt(length));
  const rows = Math.ceil(length / cols);
  const cellSize = 32;

  image.width = cols * cellSize;
  image.height = rows * cellSize;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, image.width, image.height);

  ctx.font = font
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";

  const imageData = {};

  array.forEach((char, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = (col * cellSize) + (cellSize * 0.5);
    const y = (row * cellSize) + (cellSize * 0.5);

    ctx.fillText(char, x, y);

    imageData[char] = {
      x: col * cellSize,
      y: row * cellSize,
      u0: col / cols,
      v0: row / rows,
      u1: (col + 1) / cols,
      v1: (row + 1) / rows
    }
  });

  return {image, imageData, cols, rows, cellSize, length};
}