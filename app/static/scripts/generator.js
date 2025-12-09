export function createImage(array, width, height, size = 1){
  const image = document.createElement("canvas");
  const ctx = image.getContext("2d");

  image.width = width;
  image.height = height;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, image.width, image.height);

  ctx.fillStyle = "white";

  function drawStar(ctx, x, y, size){
    ctx.beginPath();

    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y - size);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    
    ctx.moveTo(x, y);
    ctx.arc((x + size), (y + size), size, Math.PI, -1.5); // prawy gorny luk

    ctx.moveTo(x, y);
    ctx.arc((x - size), (y + size), size, -1.5, 0); // lewy gorny luk

    ctx.moveTo(x, y);
    ctx.arc((x - size), (y - size), size, 0, 1.5); // lewy dolny luk

    ctx.moveTo(x, y);
    ctx.arc((x + size), (y - size), size, 1.5, 3); // prawy dolny luk

    ctx.stroke();
    ctx.fill();
  }

  for(let i = 0; i < array.length; i += 2){
    const x = array[i];
    const y = array[i+1];

    drawStar(ctx, x, y, size);
  };

  return image;
}