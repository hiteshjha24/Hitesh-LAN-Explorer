import { useState, useEffect } from 'react';
import './App.css';
import { GetLocalHostname } from '../wailsjs/go/main/App';

function App() {
    const [hostname, setHostname] = useState<string>("Loading...");
    const [activeTab, setActiveTab] = useState<string>("dashboard");

    useEffect(() => {
        // Explicitly defining result as a string fixes the TS7006 error
        GetLocalHostname().then((result: string) => setHostname(result));
    }, []);

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="sidebar-header">
                    🌐 VEDA LAN Explorer
                </div>
                <ul className="sidebar-menu">
                    <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                        🏠 Dashboard
                    </li>
                    <li className={activeTab === 'devices' ? 'active' : ''} onClick={() => setActiveTab('devices')}>
                        💻 Devices
                    </li>
                    <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                        ⚙️ Settings
                    </li>
                </ul>
            </div>

            <div className="main-content">
                {activeTab === 'dashboard' && (
                    <div>
                        <h2>Home Network Dashboard</h2>
                        <p>Welcome to your personal private cloud.</p>
                        
                        <div className="dashboard-card">
                            <h3>🖥️ This Device (Local)</h3>
                            <p style={{ marginTop: '10px', color: '#aaaaaa' }}>
                                Hostname: <span style={{ color: '#fff' }}>{hostname}</span>
                            </p>
                            <p style={{ color: '#4CAF50', marginTop: '5px' }}>● Online</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'devices' && <h2>Paired Devices (Coming in Phase 2)</h2>}
                {activeTab === 'settings' && <h2>Settings</h2>}
            </div>
        </div>
    );
}

export default App;