export { render, renderBars, clear, PIXEL_SIZE } from "./renderer";
export { SphereRenderer } from "./sphereRenderer";
export { HemisphereRenderer } from "./hemisphereRenderer";
export { GridRenderer3D } from "./gridRenderer3D";

// Re-exported here so downstream consumers don't need to reference @shared.
export type Grid = number[][];
