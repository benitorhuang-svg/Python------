/**
 * units/types.ts — 單元型別定義
 */
export interface UnitParam {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    format: (v: number) => string;
}

export interface UnitLink {
    id: string;
    title: string;
}

export interface UnitDef {
    title: string;
    module: string;
    difficulty: string;
    description: string;
    needsData?: boolean;
    theory: string;
    defaultCode: string;
    resultVar: string;
    renderChart: (canvasId: string, data: any) => void;
    params?: UnitParam[];
    exercises?: string[];
    prevUnit: UnitLink | null;
    nextUnit: UnitLink | null;
}
