import { useState, useEffect } from 'react';
import './App.css';
import { 
    GetLocalHostname, 
    DiscoverNetworkDevices, 
    GetPairedDevices, 
    PairWithDevice 
} from '../wailsjs/go/main/App';

interface NetworkDevice {
    hostname: string;
    ip: string;
    port: number;
}

function App() {
    const [hostname, setHostname] = useState<string>("Loading...");
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    
    const [discoveredDevices, setDiscoveredDevices] = useState<NetworkDevice[]>([]);
    const [pairedDevices, setPairedDevices] = useState<NetworkDevice[]>([]);
    const [isScanning, setIsScanning] = useState<boolean>(false);

    // Fetch initial data on load
    useEffect(() => {
        GetLocalHostname().then((result: string) => setHostname(result));
        loadPairedDevices();
    }, []);

    const loadPairedDevices = async () => {
        const devices: any = await GetPairedDevices();
        setPairedDevices(devices || []);
    };

    const handleScanNetwork = async () => {
        setIsScanning(true);
        setDiscoveredDevices([]); 
        
        try {
            const foundDevices: any = await DiscoverNetworkDevices();
            setDiscoveredDevices(foundDevices || []);
        } catch (error) {
            console.error("Failed to scan network", error);
        } finally {
            setIsScanning(false);
        }
    };

    const handlePair = async (device: NetworkDevice) => {
        await PairWithDevice(device);
        alert(`Paired successfully with ${device.hostname}!`);
        loadPairedDevices(); // Refresh list
    };

    // Helper to check if a device is already paired
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
                {activeTab === 'dashboard' && (
                    <div>
                        <h2>Home Network Dashboard</h2>
                        
                        <div className="dashboard-card">
                            <h3>🖥️ This Device (Local)</h3>
                            <p style={{ marginTop: '10px', color: '#aaaaaa' }}>
                                Hostname: <span style={{ color: '#fff' }}>{hostname}</span>
                            </p>
                            <p style={{ color: '#4CAF50', marginTop: '5px' }}>● Online</p>
                        </div>
                    </div>
                )}
                
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
                
                {activeTab === 'settings' && <h2>Settings</h2>}
            </div>
        </div>
    );
}

export default App;