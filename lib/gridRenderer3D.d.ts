import { Grid } from '../../shared/types';
export declare class GridRenderer3D {
    private scene;
    private camera;
    private webgl;
    private controls;
    private mesh;
    private linesObj;
    private animId;
    constructor(container: HTMLElement);
    render(grid: Grid, satPoint?: number, offset?: number, maxHeight?: number, lines?: boolean): void;
    start(): void;
    stop(): void;
    dispose(): void;
}
