import { useState, useEffect } from 'react';
import './App.css';
import { GetLocalHostname, DiscoverNetworkDevices } from '../wailsjs/go/main/App';

// Define the shape of our device data
interface NetworkDevice {
    hostname: string;
    ip: string;
    port: number;
}

function App() {
    const [hostname, setHostname] = useState<string>("Loading...");
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    
    // State for network discovery
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const [isScanning, setIsScanning] = useState<boolean>(false);

    useEffect(() => {
        GetLocalHostname().then((result: string) => setHostname(result));
    }, []);

    const handleScanNetwork = async () => {
        setIsScanning(true);
        setDevices([]); // Clear old results
        
        try {
            // Call the Go backend scanner
            const foundDevices: any = await DiscoverNetworkDevices();
            // Map the generic response to our TypeScript interface
            setDevices(foundDevices || []);
        } catch (error) {
            console.error("Failed to scan network", error);
        } finally {
            setIsScanning(false);
        }
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
                
                {activeTab === 'devices' && (
                    <div>
                        <h2>Discovered Devices</h2>
                        <p style={{ marginBottom: '20px', color: '#aaaaaa' }}>
                            Scanning your local Wi-Fi for other VEDA agents...
                        </p>
                        
                        <button 
                            onClick={handleScanNetwork} 
                            disabled={isScanning}
                            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
                        >
                            {isScanning ? "Scanning (3s)..." : "🔍 Scan Network"}
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {devices.length === 0 && !isScanning && (
                                <p style={{ color: '#ff5555' }}>No devices found. Click scan to search.</p>
                            )}
                            
                            {devices.map((device, index) => (
                                <div key={index} style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '6px', border: '1px solid #333' }}>
                                    <h3 style={{ margin: '0 0 5px 0' }}>🖥️ {device.hostname}</h3>
                                    <p style={{ margin: 0, color: '#aaaaaa', fontSize: '14px' }}>
                                        IP: {device.ip} | Port: {device.port}
                                    </p>
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