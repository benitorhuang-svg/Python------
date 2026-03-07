import { useState, useEffect } from 'react';
import { UNIT_METADATA } from '../units-registry';
import { BookOpen, ChevronDown, ChevronRight, Layers, Moon, Sun, Zap } from 'lucide-react';

interface Props {
    activeId: string | null;
    collapsed: boolean;
    onToggle: () => void;
    darkMode?: boolean;
    onToggleTheme?: () => void;
}

export default function UnitSidebar({ activeId, collapsed, onToggle, darkMode, onToggleTheme }: Props) {
    // Group units by module, keyed by numeric prefix for correct ordering
    const moduleGroups: Record<string, { id: string; title: string; moduleName: string }[]> = {};
    Object.entries(UNIT_METADATA).forEach(([id, meta]) => {
        const modName = meta.module;
        if (!moduleGroups[modName]) moduleGroups[modName] = [];
        moduleGroups[modName].push({ id, title: meta.title, moduleName: modName });
    });

    // Sort by the numeric prefix of the first unit ID in each module (e.g. "1-1" → 1)
    const moduleKeys = Object.keys(moduleGroups).sort((a, b) => {
        const aNum = parseInt(moduleGroups[a][0].id.split('-')[0], 10);
        const bNum = parseInt(moduleGroups[b][0].id.split('-')[0], 10);
        return aNum - bNum;
    });

    // Track which modules are expanded
    const activeModule = activeId ? UNIT_METADATA[activeId]?.module : null;
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        if (activeModule) init[activeModule] = true;
        return init;
    });

    // Sync expanded state when activeId changes (e.g. clicking "Next Unit")
    useEffect(() => {
        if (activeModule) {
            setExpanded({ [activeModule]: true });
        }
    }, [activeModule]);

    const toggleModule = (key: string) => {
        setExpanded(prev => ({ [key]: !prev[key] }));
    };

    if (collapsed) {
        return (
            <aside className="unit-sidebar collapsed">
                <div className="sidebar-collapsed-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '16px 0' }}>
                    <div
                        className={`theme-switch-capsule ${darkMode ? 'dark' : ''}`}
                        onClick={onToggleTheme}
                    >
                        <div className="capsule-knob">
                            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                        </div>
                    </div>
                </div>
                <div className="sidebar-collapsed-icons">
                    {moduleKeys.map((key, i) => {
                        const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
                        return (
                            <div
                                key={key}
                                className={`sidebar-icon-item ${key === activeModule ? 'active' : ''}`}
                                title={key}
                                onClick={() => {
                                    setExpanded({ [key]: true });
                                    onToggle(); // Expand the sidebar
                                }}
                            >
                                <span className="chinese-num">
                                    {chineseNums[i] || (i + 1)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </aside>
        );
    }

    return (
        <aside className="unit-sidebar">
            <div className="sidebar-brand-row">
                <div
                    className={`theme-switch-capsule ${darkMode ? 'dark' : ''}`}
                    onClick={onToggleTheme}
                    title={darkMode ? "切換至淺色模式" : "切換至深色模式"}
                >
                    <div className="capsule-knob">
                        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                    </div>
                </div>
                <div className="nav-brand" onClick={() => (window.location.hash = 'home')}>
                    <span className="brand-text">Quant_Lab</span>
                </div>
            </div>


            <nav className="sidebar-tree">
                {moduleKeys.map((modName) => {
                    const units = moduleGroups[modName];
                    const isExpanded = expanded[modName];
                    const shortName = modName.split(' · ')[1] || modName;
                    const modNum = modName.match(/模組(\S+)/)?.[1] || '';

                    return (
                        <div key={modName} className="tree-module">
                            <button
                                className={`tree-module-header ${isExpanded ? 'expanded' : ''}`}
                                onClick={() => toggleModule(modName)}
                            >
                                <span className="tree-module-label">
                                    {modNum && <span className="tree-mod-num">{modNum}</span>}
                                    {shortName}
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="tree-unit-list">
                                    {units.map(u => (
                                        <a
                                            key={u.id}
                                            className={`tree-unit-item ${activeId === u.id ? 'active' : ''}`}
                                            href={`#unit/${u.id}`}
                                        >
                                            <span className="tree-unit-dot" />
                                            <span className="tree-unit-name">{u.title}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}
