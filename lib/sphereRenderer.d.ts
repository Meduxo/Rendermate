import { Grid } from './lib-types';
export declare class SphereRenderer {
    private mapCanvas;
    private scene;
    private camera;
    private webgl;
    private controls;
    private meshes;
    private linesObjs;
    private lastGrids;
    private lastSatPoints;
    private animId;
    constructor(container: HTMLElement, mapCanvas: HTMLCanvasElement);
    render(slot: 0 | 1, grid: Grid, satPoint?: number, displace?: boolean, offset?: number, maxHeight?: number, lines?: boolean): void;
    private updateMap;
    start(): void;
    stop(): void;
    dispose(): void;
}
