import { BookOpen, Zap, ArrowRight, Activity, Github, TrendingUp } from 'lucide-react';

export default function Home() {
    return (
        <section className="hero">
            <div className="hero-content fade-in" style={{ position: 'relative', zIndex: 1 }}>


                <h1>
                    基於 PWA 技術的 <span className="highlight">量化實戰</span>
                    <br />
                    互動教學平台
                </h1>

                <p className="hero-subtitle">
                    無需配置任何伺服器與本地環境。透過 WebAssembly 直接驅動 <span style={{ whiteSpace: 'nowrap' }}>Python 運算核心</span>，
                    學習理論、動態調整參數，並即時體驗專業級的回測視覺化數據分析。
                </p>

                <div className="hero-stats">
                    <div className="hero-stat">
                        <div className="hero-stat-icon" style={{ color: 'var(--brand-secondary)' }}>
                            <BookOpen size={24} />
                        </div>
                        <div className="hero-stat-number">07</div>
                        <div className="hero-stat-label">課程模組</div>
                    </div>

                    <div className="hero-stat">
                        <div className="hero-stat-icon" style={{ color: 'var(--brand-primary)' }}>
                            <Activity size={24} />
                        </div>
                        <div className="hero-stat-number">20</div>
                        <div className="hero-stat-label">經典量化策略</div>
                    </div>

                    <div className="hero-stat">
                        <div className="hero-stat-icon" style={{ color: 'var(--brand-emerald)' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="hero-stat-number">100%</div>
                        <div className="hero-stat-label">WebAssembly 驅動</div>
                    </div>
                </div>

                <div style={{
                    marginTop: '3.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <a
                        href="https://github.com/benitorhuang-svg"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-dim)',
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            transition: 'color 0.3s',
                            marginTop: '4px'
                        }}
                    >
                        <Github size={13} /> Open Source on GitHub
                    </a>
                </div>
            </div>
        </section>
    );
}
