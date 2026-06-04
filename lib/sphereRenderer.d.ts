import { Grid } from '../../shared/types';
export declare class SphereRenderer {
    private mapCanvas;
    private scene;
    private camera;
    private webgl;
    private controls;
    private mesh;
    private linesObj;
    private animId;
    private lastGrid;
    private lastSatPoint;
    constructor(container: HTMLElement, mapCanvas: HTMLCanvasElement);
    render(grid: Grid, satPoint?: number, displace?: boolean, offset?: number, maxHeight?: number, lines?: boolean): void;
    private updateMap;
    start(): void;
    stop(): void;
    dispose(): void;
}
