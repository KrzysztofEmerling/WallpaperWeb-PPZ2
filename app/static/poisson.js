export function poissonDiskSampling(width, height, seed = 0, minDistance = 20, k = 30){

  // =========== funkcje pomocnicze

  function createGrid(width, height, cellSize){
    const gw = Math.ceil(width / cellSize); // wzor z algorytmu bridsona: r/sqrt(n)
    const gh = Math.ceil(height / cellSize);
    const g = new Array(gw * gh).fill(-1);
    
    return [gw, gh, g];
  }

  function addSample(x, y){
    approvedSamples.push([x, y]); 
    const [gridX, gridY] = getCellCoordinates(x, y); 
    grid[gridX + gridY * gridWidth] = approvedSamples.length - 1;
    toCheckSamples.push(approvedSamples.length - 1); 
  }

  function getCellCoordinates(x, y){
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    return [gx, gy];
  }

  function isValidSample(x, y){
    const [cellX, cellY] = getCellCoordinates(x, y);

    for (let i = Math.max(0, cellX - 2); i < Math.min(gridWidth, cellX + 3); i++){
      for (let j = Math.max(0, cellY - 2); j < Math.min(gridHeight, cellY + 3); j ++){

        const neighborIndex = grid[i + j * gridWidth];

        if (neighborIndex !== -1){

          const [neighborX, neighborY] = approvedSamples[neighborIndex];
          const dx = neighborX - x;
          const dy = neighborY - y;

          if ((dx * dx) + (dy * dy) < (minDistance * minDistance)) return false;
        }
      }
    }
    return true;
  }

  // ==============================

  let rand = Math.random();
  const cellSize = minDistance / Math.sqrt(2);

  const [gridWidth, gridHeight, grid] = createGrid(width, height, cellSize);

  const approvedSamples = [];
  const toCheckSamples = [];

  addSample(rand * width, rand * height);

  while (toCheckSamples.length > 0){
    const index = Math.floor(Math.random() * toCheckSamples.length);
    const baseSample = approvedSamples[index];
    const [baseSampleX, baseSampleY] = baseSample;
    let accepted = false;

    for (let attempt = 0; attempt < k; attempt++){
      const angle = Math.random() * Math.PI * 2;
      const radius = minDistance * (1 + Math.random());

      const currentX = baseSampleX + radius * Math.cos(angle);
      const currentY = baseSampleY + radius * Math.sin(angle);

      if (
        (currentX >= 0 && currentX < width) &&
        (currentY >= 0 && currentY < height) && 
        isValidSample(currentX, currentY)
      ){
        addSample(currentX, currentY);
        accepted = true;
        rand = Math.random();
        break;
      }
    }
    if (!accepted){
      const indexToRemove = toCheckSamples.indexOf(index);
      toCheckSamples.splice(indexToRemove, 1);
    }
  }

  return approvedSamples.flat();
}