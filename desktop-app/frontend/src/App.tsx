import { useState, useEffect } from 'react';
import './App.css';
import { 
    GetLocalHostname, 
    DiscoverNetworkDevices, 
    GetPairedDevices, 
    PairWithDevice,
    GetSystemStats
} from '../wailsjs/go/main/App';

interface NetworkDevice {
    hostname: string;
    ip: string;
    port: number;
}

interface SystemStats {
    cpu_usage: number;
    ram_total: number;
    ram_used: number;
    disk_total: number;
    disk_used: number;
}

// Helper to convert Bytes to Gigabytes
const formatGB = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

function App() {
    const [hostname, setHostname] = useState<string>("Loading...");
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    
    // State for network discovery & pairing
    const [discoveredDevices, setDiscoveredDevices] = useState<NetworkDevice[]>([]);
    const [pairedDevices, setPairedDevices] = useState<NetworkDevice[]>([]);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    
    // State for live stats
    const [stats, setStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        // 1. Get Hostname
        GetLocalHostname().then((result: string) => setHostname(result));
        
        // 2. Load Paired Devices
        loadPairedDevices();

        // 3. Initial fetch for stats
        fetchStats();

        // 4. Polling loop: fetch stats every 2 seconds for the live dashboard
        const interval = setInterval(() => {
            fetchStats();
        }, 2000);

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const fetchStats = async () => {
        try {
            const sysStats: any = await GetSystemStats();
            setStats(sysStats);
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const loadPairedDevices = async () => {
        try {
            const devices: any = await GetPairedDevices();
            setPairedDevices(devices || []);
        } catch (error) {
            console.error("Failed to load paired devices", error);
        }
    };

    const handleScanNetwork = async () => {
        setIsScanning(true);
        setDiscoveredDevices([]); 
        
        try {
            const foundDevices: any = await DiscoverNetworkDevices();
            setDiscoveredDevices(foundDevices || []);
        } catch (error) {
            console.error("Failed to scan", error);
        } finally {
            setIsScanning(false);
        }
    };

    const handlePair = async (device: NetworkDevice) => {
        try {
            await PairWithDevice(device);
            alert(`Paired successfully with ${device.hostname}!`);
            loadPairedDevices();
        } catch (error) {
            console.error("Failed to pair", error);
        }
    };

    const isPaired = (hostnameToCheck: string) => {
        return pairedDevices.some(d => d.hostname === hostnameToCheck);
    };

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
                {/* --- DASHBOARD TAB --- */}
                {activeTab === 'dashboard' && (
                    <div>
                        <h2>Home Network Dashboard</h2>
                        
                        <div className="dashboard-card" style={{ width: '400px' }}>
                            <h3>🖥️ This Device (Local)</h3>
                            <p style={{ marginTop: '5px', color: '#aaaaaa' }}>{hostname}</p>
                            
                            {stats ? (
                                <div style={{ marginTop: '20px' }}>
                                    {/* CPU Bar */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>CPU Usage</span>
                                            <span>{stats.cpu_usage.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#333', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                                            <div style={{ width: `${stats.cpu_usage}%`, backgroundColor: '#4CAF50', height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                                        </div>
                                    </div>

                                    {/* RAM Bar */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>RAM</span>
                                            <span>{formatGB(stats.ram_used)} / {formatGB(stats.ram_total)}</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#333', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                                            <div style={{ width: `${(stats.ram_used / stats.ram_total) * 100}%`, backgroundColor: '#2196F3', height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                                        </div>
                                    </div>

                                    {/* Storage Bar */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>Storage (Root/C:)</span>
                                            <span>{formatGB(stats.disk_used)} / {formatGB(stats.disk_total)}</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#333', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                                            <div style={{ width: `${(stats.disk_used / stats.disk_total) * 100}%`, backgroundColor: '#FFC107', height: '100%', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ marginTop: '20px', color: '#aaaaaa' }}>Loading hardware stats...</p>
                            )}
                        </div>
                    </div>
                )}
                
                {/* --- DEVICES TAB --- */}
                {activeTab === 'devices' && (
                    <div>
                        <h2>Paired Devices</h2>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '40px' }}>
                            {pairedDevices.length === 0 ? (
                                <p style={{ color: '#aaaaaa' }}>No devices paired yet.</p>
                            ) : (
                                pairedDevices.map((device, i) => (
                                    <div key={i} className="dashboard-card" style={{ marginTop: '10px' }}>
                                        <h3 style={{ color: '#4CAF50' }}>✓ {device.hostname}</h3>
                                        <p style={{ color: '#aaaaaa', fontSize: '14px', marginTop: '5px' }}>{device.ip}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <h2>Discover New Devices</h2>
                        <button 
                            onClick={handleScanNetwork} 
                            disabled={isScanning}
                            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', margin: '15px 0' }}
                        >
                            {isScanning ? "Scanning (3s)..." : "🔍 Scan Network"}
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {discoveredDevices.map((device, index) => (
                                <div key={index} style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '6px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0' }}>🖥️ {device.hostname}</h3>
                                        <p style={{ margin: 0, color: '#aaaaaa', fontSize: '14px' }}>IP: {device.ip}</p>
                                    </div>
                                    {!isPaired(device.hostname) ? (
                                        <button 
                                            onClick={() => handlePair(device)}
                                            style={{ padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Pair Device
                                        </button>
                                    ) : (
                                        <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Paired</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && <h2>Settings</h2>}
            </div>
        </div>
    );
}

export default App;