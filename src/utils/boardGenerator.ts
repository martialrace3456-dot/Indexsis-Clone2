import { Dot } from "@/types/game";

export const generateDotsWithVariableDensity = (
  totalDots: number,
  boardSize: number
): Dot[] => {
  const dots: Dot[] = [];
  const minDistance = boardSize * 0.002;

  // Spatial partitioning grid for fast collision detection
  const gridCellSize = minDistance * 2; // Each cell is 2x minimum distance
  const gridSize = Math.ceil(boardSize / gridCellSize);
  const grid: Map<string, Dot[]> = new Map();

  const getGridKey = (x: number, y: number): string => {
    const col = Math.floor(x / gridCellSize);
    const row = Math.floor(y / gridCellSize);
    return `${col},${row}`;
  };

  const addToGrid = (dot: Dot) => {
    const key = getGridKey(dot.x, dot.y);
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(dot);
  };

  const isValidPosition = (x: number, y: number): boolean => {
    const col = Math.floor(x / gridCellSize);
    const row = Math.floor(y / gridCellSize);
    
    // Only check neighboring cells (3x3 grid around the point)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = `${col + dx},${row + dy}`;
        const cellDots = grid.get(key);
        if (cellDots) {
          for (const dot of cellDots) {
            const dist = Math.sqrt(
              Math.pow(dot.x - x, 2) + Math.pow(dot.y - y, 2)
            );
            if (dist < minDistance) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  // Create density clusters (3-5 clusters)
  const numClusters = 3 + Math.floor(Math.random() * 3);
  const clusters = Array.from({ length: numClusters }, () => ({
    x: Math.random() * boardSize,
    y: Math.random() * boardSize,
    radius: boardSize * (0.15 + Math.random() * 0.25),
    density: 0.3 + Math.random() * 0.7,
  }));

  // Generate dots with cluster-based density
  let attempts = 0;
  const maxAttempts = totalDots * 20; // Reduced from 50 since spatial partitioning is much faster

  while (dots.length < totalDots && attempts < maxAttempts) {
    attempts++;

    const x = Math.random() * boardSize;
    const y = Math.random() * boardSize;

    let probability = 0.2;
    for (const cluster of clusters) {
      const distance = Math.sqrt(
        Math.pow(x - cluster.x, 2) + Math.pow(y - cluster.y, 2)
      );
      if (distance < cluster.radius) {
        const factor = 1 - distance / cluster.radius;
        probability += cluster.density * factor;
      }
    }

    if (Math.random() < probability) {
      if (isValidPosition(x, y)) {
        const dot = { x, y };
        dots.push(dot);
        addToGrid(dot);
      }
    }
  }

  console.log(`Generated ${dots.length} dots out of ${totalDots} requested`);
  return dots;
};

export const calculateLocalDensity = (
  dots: Dot[],
  centerX: number,
  centerY: number,
  radius: number
): number => {
  let dotsInCircle = 0;
  
  // Count dots within the circle boundary
  for (const dot of dots) {
    const dx = dot.x - centerX;
    const dy = dot.y - centerY;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSquared = radius * radius;
    
    // Use squared distances to avoid unnecessary sqrt calls
    if (distanceSquared <= radiusSquared) {
      dotsInCircle++;
    }
  }

  // Circle area = π × r²
  const circleArea = Math.PI * radius * radius;
  
  // Debug logging
  console.log('Local Density Calculation:', {
    dotsInCircle,
    radius,
    circleArea,
    density: dotsInCircle / circleArea,
    totalDotsChecked: dots.length
  });
  
  // Density = dots / area (dots per square unit)
  return dotsInCircle / circleArea;
};

export const calculateActualDensity = (
  totalDots: number,
  boardSize: number
): number => {
  return totalDots / (boardSize * boardSize);
};

export const calculateStandardDeviation = (
  dots: Dot[],
  boardSize: number
): number => {
  const gridSize = 10;
  const cellSize = boardSize / gridSize;
  const densities: number[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x1 = col * cellSize;
      const y1 = row * cellSize;
      const x2 = x1 + cellSize;
      const y2 = y1 + cellSize;

      const dotsInCell = dots.filter(
        (dot) => dot.x >= x1 && dot.x < x2 && dot.y >= y1 && dot.y < y2
      ).length;

      const cellArea = cellSize * cellSize;
      densities.push(dotsInCell / cellArea);
    }
  }

  const mean = densities.reduce((sum, d) => sum + d, 0) / densities.length;
  const variance =
    densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
    densities.length;

  return Math.sqrt(variance);
};

export const calculateScore = (
  guess: number,
  actualDensity: number,
  standardDeviation: number
): number => {
  const difference = Math.abs(guess - actualDensity);
  
  if (difference === 0) return 10;
  if (difference > standardDeviation) return 0;
  
  const score = Math.max(0, 10 - 9 * (difference / standardDeviation));
  return Math.round(score * 100) / 100;
};
