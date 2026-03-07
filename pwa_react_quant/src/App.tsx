import { useEffect, useState, useCallback } from 'react';
import { initPyodide } from './engine/pyodide-runner';
import { UNIT_LOADERS, UNIT_METADATA, UNIT_EXPORT_MAP } from './units-registry';
import type { UnitDef } from './units/types';
import Home from './components/Home';
import UnitContent from './components/UnitContent';
import UnitSidebar from './components/UnitSidebar';
import { Moon, Sun } from 'lucide-react';

export default function App() {
  const getHashUnitId = useCallback(() => {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash.startsWith('unit/')) {
      return hash.replace('unit/', '');
    }
    return null;
  }, []);

  const [currentUnitId, setCurrentUnitId] = useState<string | null>(() => getHashUnitId());
  const [currentUnit, setCurrentUnit] = useState<UnitDef | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [statusText, setStatusText] = useState('Booting Engine');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleHashChange = useCallback(() => {
    const id = getHashUnitId();
    setCurrentUnitId(id);
    if (id) {
      setLoadingUnit(true);
    } else {
      setCurrentUnit(null);
      setLoadingUnit(false);
    }
  }, [getHashUnitId]);

  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    initPyodide(msg => setStatusText(msg)).then(() => setPyodideReady(true));
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  useEffect(() => {
    if (currentUnitId && UNIT_LOADERS[currentUnitId]) {
      const loader = UNIT_LOADERS[currentUnitId];
      const exportKey = UNIT_EXPORT_MAP[currentUnitId];
      loader().then(module => {
        setCurrentUnit(module[exportKey]);
        setLoadingUnit(false);
      });
    }
  }, [currentUnitId]);

  const loadingProgress = pyodideReady ? 100 : Math.floor(Math.random() * 15 + 80);

  return (
    <>
      {!pyodideReady && (
        <div className="loading-overlay">
          <div style={{ position: 'relative', marginBottom: 28 }}>
            <div className="spinner" style={{ width: 56, height: 56 }} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--brand-primary)'
            }}>
              {loadingProgress}%
            </div>
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--brand-primary)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
            opacity: 0.7
          }}>
            {statusText}...
          </div>
          <div style={{
            marginTop: 16,
            width: 200,
            height: 2,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'var(--gradient-primary, var(--brand-primary))',
              borderRadius: 2,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      )}

      <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
        {/* ── Main Layout: Sidebar + Content ── */}
        <div className={`app-body ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <UnitSidebar
            activeId={currentUnitId}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            darkMode={darkMode}
            onToggleTheme={() => setDarkMode(!darkMode)}
          />

          <main className="main-content">
            {currentUnitId ? (
              loadingUnit ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '100%', background: 'var(--bg-app)'
                }}>
                  <div className="spinner" />
                </div>
              ) : currentUnit ? (
                <UnitContent
                  key={currentUnitId}
                  unitId={currentUnitId}
                  unit={currentUnit}
                  pyodideReady={pyodideReady}
                  onRunStart={() => setSidebarCollapsed(true)}
                />
              ) : null
            ) : (
              <Home />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
