import { Grid } from './lib-types';
export declare class GridRenderer3D {
    private scene;
    private camera;
    private webgl;
    private controls;
    private meshes;
    private linesObjs;
    private animId;
    constructor(container: HTMLElement);
    render(slot: 0 | 1, grid: Grid, satPoint?: number, offset?: number, maxHeight?: number, lines?: boolean): void;
    start(): void;
    stop(): void;
    dispose(): void;
}
