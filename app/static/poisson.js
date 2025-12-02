export function poissonDiskSampling(width, height, seed = 123, minDistance = 50, k = 30){

  // =========== funkcje pomocnicze

  function mulberry32(seed) {
    return function() {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
      return t / 4294967296;
    }
  }

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

  const rand = mulberry32(seed);
  const cellSize = minDistance / Math.sqrt(2);

  const [gridWidth, gridHeight, grid] = createGrid(width, height, cellSize);

  const approvedSamples = [];
  const toCheckSamples = [];

  const centerX = width / 2;
  const centerY = height / 2;
  const offset = 50;

  addSample(centerX + (rand() - 0.5) * offset, centerY + (rand() - 0.5) * offset);
  

  while (toCheckSamples.length > 0){
    const index = Math.floor(rand() * toCheckSamples.length);
    const baseSampleIndex = toCheckSamples[index];
    const [baseSampleX, baseSampleY] = approvedSamples[baseSampleIndex];
    let accepted = false;

    for (let attempt = 0; attempt < k; attempt++){
      const angle = rand() * Math.PI * 2;
      const radius = minDistance * (1 + rand());

      const currentX = baseSampleX + radius * Math.cos(angle);
      const currentY = baseSampleY + radius * Math.sin(angle);

      if (
        (currentX >= 0 && currentX < width) &&
        (currentY >= 0 && currentY < height) && 
        isValidSample(currentX, currentY)
      ){
        addSample(currentX, currentY);
        accepted = true;
        break;
      }
    }
    if (!accepted){
      toCheckSamples.splice(index, 1);
    }
  }

  return approvedSamples.flat();
}