import { UNIT_METADATA } from '../units-registry';

interface SidebarProps {
    activeId: string | null;
    isOpen: boolean;
}

export default function Sidebar({ activeId, isOpen }: SidebarProps) {
    // Group meta by module number
    const moduleGroups: Record<string, { id: string; title: string; moduleName: string }[]> = {};

    Object.entries(UNIT_METADATA).forEach(([id, meta]) => {
        const modId = id.split('-')[0];
        if (!moduleGroups[modId]) moduleGroups[modId] = [];
        moduleGroups[modId].push({ id, ...meta, moduleName: meta.module });
    });

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
            <div className="sidebar-header">
                <span className="sidebar-logo-icon">📈</span>
                <span className="sidebar-logo">量化交易教學</span>
            </div>
            <nav className="sidebar-nav" id="sidebar-nav">
                <div className="nav-module">
                    <a className={`nav-item ${!activeId ? 'active' : ''}`} href="#home">
                        <span className="nav-item-icon">🏠</span> 課程總覽
                    </a>
                </div>

                {Object.keys(moduleGroups).sort().map(num => {
                    const modUnits = moduleGroups[num];
                    return (
                        <div className="nav-module" key={num}>
                            <div className="nav-module-title">{modUnits[0].moduleName}</div>
                            {modUnits.map(u => (
                                <a
                                    key={u.id}
                                    className={`nav-item ${activeId === u.id ? 'active' : ''}`}
                                    href={`#unit/${u.id}`}
                                >
                                    <span className="nav-item-icon">📊</span> {u.title}
                                    <span className="nav-item-badge">精選策略</span>
                                </a>
                            ))}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}
