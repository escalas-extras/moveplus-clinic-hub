/** Pipeline de remoção de matte/fundo — compartilhado entre browser e Node (fixtures). */

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

/** Remove fundo sólido amostrado nos cantos — flood fill a partir das bordas. */
function removeCornerBackground(ctx: CanvasRenderingContext2D, width: number, height: number, tolerance = 36) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const at = (x: number, y: number) => (y * width + x) * 4;
  const sample = (x: number, y: number) => ({
    r: data[at(x, y)],
    g: data[at(x, y) + 1],
    b: data[at(x, y) + 2],
    a: data[at(x, y) + 3],
  });

  const corners = [
    sample(0, 0),
    sample(width - 1, 0),
    sample(0, height - 1),
    sample(width - 1, height - 1),
  ].filter((c) => c.a > 128);
  if (!corners.length) return;

  const bg = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / corners.length),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / corners.length),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / corners.length),
  };

  const matches = (x: number, y: number) => {
    const i = at(x, y);
    if (data[i + 3] < 128) return true;
    return colorDist(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b) <= tolerance;
  };

  const seen = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !matches(x, y)) return;
    seen[idx] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    const i = at(x, y);
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(image, 0, 0);
}

/** Zera RGB em pixels transparentes — evita franja preta no jsPDF. */
function sanitizeAlphaFringe(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function removeBlackMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const darkCorners = corners.filter(([x, y]) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 200 && data[i] < 48 && data[i + 1] < 48 && data[i + 2] < 48;
  }).length;
  if (darkCorners < 1) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200 && data[i] < 48 && data[i + 1] < 48 && data[i + 2] < 48) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function removeWhiteMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const isWhiteEdge = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a < 230) return false;
    return data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240;
  };

  let whiteEdge = 0;
  let edge = 0;
  for (let x = 0; x < width; x++) {
    edge += 2;
    if (isWhiteEdge(x, 0)) whiteEdge++;
    if (isWhiteEdge(x, height - 1)) whiteEdge++;
  }
  for (let y = 1; y < height - 1; y++) {
    edge += 2;
    if (isWhiteEdge(0, y)) whiteEdge++;
    if (isWhiteEdge(width - 1, y)) whiteEdge++;
  }
  if (edge === 0 || whiteEdge / edge < 0.55) return;

  const seen = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !isWhiteEdge(x, y)) return;
    seen[idx] = 1;
    queue.push([x, y]);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    const i = (y * width + x) * 4;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(image, 0, 0);
}

function removeDarkEdgeMatte(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const isDarkEdgePixel = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const alpha = data[i + 3];
    if (alpha < 230) return false;
    return data[i] < 42 && data[i + 1] < 42 && data[i + 2] < 42;
  };

  let darkEdge = 0;
  let edge = 0;
  for (let x = 0; x < width; x++) {
    edge += 2;
    if (isDarkEdgePixel(x, 0)) darkEdge++;
    if (isDarkEdgePixel(x, height - 1)) darkEdge++;
  }
  for (let y = 1; y < height - 1; y++) {
    edge += 2;
    if (isDarkEdgePixel(0, y)) darkEdge++;
    if (isDarkEdgePixel(width - 1, y)) darkEdge++;
  }
  if (edge === 0 || darkEdge / edge < 0.12) return;

  const seen = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx] || !isDarkEdgePixel(x, y)) return;
    seen[idx] = 1;
    queue.push([x, y]);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const [x, y] = queue[qi];
    const i = (y * width + x) * 4;
    data[i + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  ctx.putImageData(image, 0, 0);
}

export function applyMattePipeline(ctx: CanvasRenderingContext2D, width: number, height: number) {
  removeWhiteMatte(ctx, width, height);
  removeCornerBackground(ctx, width, height);
  removeBlackMatte(ctx, width, height);
  removeDarkEdgeMatte(ctx, width, height);
  removeCornerBackground(ctx, width, height, 28);
  sanitizeAlphaFringe(ctx, width, height);
}
