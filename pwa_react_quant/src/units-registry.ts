import type { UnitDef } from './units/types';

// Use dynamic imports to keep initial bundle small.
// Each unit will be loaded only when the user navigates to it.
export const UNIT_LOADERS: Record<string, () => Promise<{ [key: string]: UnitDef }>> = {
    '1-1': () => import('./units/1-1-dual-ma'),
    '2-1': () => import('./units/2-1-macd'),
    '2-2': () => import('./units/2-2-adx-macd'),
    '2-3': () => import('./units/2-3-ama'),
    '2-4': () => import('./units/2-4-aroon'),
    '2-5': () => import('./units/2-5-emv'),
    '3-1': () => import('./units/3-1-dual-thrust'),
    '3-2': () => import('./units/3-2-hl-breakout'),
    '3-3': () => import('./units/3-3-donchian'),
    '3-4': () => import('./units/3-4-hans123'),
    '3-5': () => import('./units/3-5-fiali'),
    '3-6': () => import('./units/3-6-dynamic-breakout'),
    '3-7': () => import('./units/3-7-r-breaker'),
    '4-1': () => import('./units/4-1-thermostat'),
    '5-1': () => import('./units/5-1-arbitrage'),
    '5-2': () => import('./units/5-2-bias'),
    '6-1': () => import('./units/6-1-martingale'),
    '6-2': () => import('./units/6-2-kelly'),
    '6-4': () => import('./units/6-4-anti-martingale'),
    '7-1': () => import('./units/7-1-fundamentals')
};

// Map of exported variables from each file.
// Since we used named exports (e.g., export const unitDualMA),
// we need to identify the key inside the module object.
export const UNIT_EXPORT_MAP: Record<string, string> = {
    '1-1': 'unitDualMA',
    '2-1': 'unitMacd',
    '2-2': 'unitAdxMacd',
    '2-3': 'unitAma',
    '2-4': 'unitAroon',
    '2-5': 'unitEmv',
    '3-1': 'unitDualThrust',
    '3-2': 'unitHlBreakout',
    '3-3': 'unitDonchian',
    '3-4': 'unitHans123',
    '3-5': 'unitFiali',
    '3-6': 'unitDynamicBreakout',
    '3-7': 'unitRBreaker',
    '4-1': 'unitThermostat',
    '5-1': 'unitArbitrage',
    '5-2': 'unitBias',
    '6-1': 'unitMartingale',
    '6-2': 'unitKelly',
    '6-4': 'unitAntiMartingale',
    '7-1': 'unitFundamentals'
};

// Basic metadata for the sidebar without loading the full content
export const UNIT_METADATA: Record<string, { title: string, module: string }> = {
    '1-1': { title: '雙均線策略', module: '模組一 · 量化入門' },
    '2-1': { title: '經典 MACD 策略', module: '模組二 · 趨勢跟蹤' },
    '2-2': { title: '利用平均趨向指數輔助MACD策略', module: '模組二 · 趨勢跟蹤' },
    '2-3': { title: '自適應動態雙均線策略 (AMA)', module: '模組二 · 趨勢跟蹤' },
    '2-4': { title: '阿隆指標 AROON 策略', module: '模組二 · 趨勢跟蹤' },
    '2-5': { title: '簡易波動 EMV 策略', module: '模組二 · 趨勢跟蹤' },
    '3-1': { title: 'Dual Thrust 策略', module: '模組三 · 突破策略' },
    '3-2': { title: '日內高低點突破策略', module: '模組三 · 突破策略' },
    '3-3': { title: '增強版唐奇安通道策略', module: '模組三 · 突破策略' },
    '3-4': { title: 'Hans123 日內突破策略', module: '模組三 · 突破策略' },
    '3-5': { title: '菲阿里四價策略', module: '模組三 · 突破策略' },
    '3-6': { title: '動態波幅突破策略', module: '模組三 · 突破策略' },
    '3-7': { title: 'R-breaker 交易策略', module: '模組三 · 突破策略' },
    '4-1': { title: '經典恆溫器策略', module: '模組四 · 切換策略' },
    '5-1': { title: '期貨跨期套利實戰', module: '模組五 · 高級交易與套利' },
    '5-2': { title: '乖離率 BIAS 策略', module: '模組五 · 高級交易與套利' },
    '6-1': { title: '馬丁格爾策略與倍增法', module: '模組六 · 風險管理' },
    '6-2': { title: '凱利公式部位管理', module: '模組六 · 風險管理' },
    '6-4': { title: '反向馬丁格爾 (逆勢倍增法)', module: '模組六 · 風險管理' },
    '7-1': { title: '基本面與技術面結合實踐', module: '模組七 · 終極實戰' }
};
