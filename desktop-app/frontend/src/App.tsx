import { useState, useEffect, useRef } from 'react';
import './App.css';
import { 
    GetLocalHostname, DiscoverNetworkDevices, GetPairedDevices, PairWithDevice, GetSystemStats,
    GetRootPaths, ListDirectory 
} from '../wailsjs/go/main/App';

interface NetworkDevice { hostname: string; ip: string; port: number; }
interface SystemStats { cpu_usage: number; ram_total: number; ram_used: number; disk_total: number; disk_used: number; }
interface FileNode { name: string; path: string; size: number; is_dir: boolean; mod_time: string; }

const formatGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
const formatKB = (bytes: number) => {
    if (bytes === 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

function App() {
    const [hostname, setHostname] = useState<string>("Loading...");
    const [activeTab, setActiveTab] = useState<string>("dashboard");
    
    const [discoveredDevices, setDiscoveredDevices] = useState<NetworkDevice[]>([]);
    const [pairedDevices, setPairedDevices] = useState<NetworkDevice[]>([]);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [stats, setStats] = useState<SystemStats | null>(null);

    const [currentPath, setCurrentPath] = useState<string>("");
    const [files, setFiles] = useState<FileNode[]>([]);
    const [fsError, setFsError] = useState<string>("");
    
    const [targetDevice, setTargetDevice] = useState<NetworkDevice | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    
    // Reference for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        GetLocalHostname().then(res => setHostname(res));
        loadPairedDevices();
        fetchStats();
        const interval = setInterval(() => fetchStats(), 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab === 'files' && currentPath === "") {
            loadRootPaths();
        }
    }, [activeTab, targetDevice]);

    const fetchStats = async () => { try { setStats(await GetSystemStats() as any); } catch (e) {} };
    const loadPairedDevices = async () => { try { setPairedDevices((await GetPairedDevices() as any) || []); } catch (e) {} };
    
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

    const isPaired = (h: string) => pairedDevices.some(d => d.hostname === h);

    const loadRootPaths = async () => {
        try {
            setFsError("");
            setCurrentPath(""); 
            let roots: any = [];
            
            if (targetDevice) {
                const res = await fetch(`http://${targetDevice.ip}:${targetDevice.port}/api/fs/roots`);
                if (!res.ok) throw new Error(`Remote Agent Error: ${res.statusText}`);
                roots = await res.json();
            } else {
                roots = await GetRootPaths();
            }
            setFiles(roots || []);
        } catch (err: any) {
            setFsError(err.toString());
        }
    };

    const handleNavigate = async (path: string) => {
        try {
            setFsError("");
            let contents: any = [];
            
            if (targetDevice) {
                const res = await fetch(`http://${targetDevice.ip}:${targetDevice.port}/api/fs/list?path=${encodeURIComponent(path)}`);
                if (!res.ok) throw new Error("Permission Denied on Remote Device");
                contents = await res.json();
            } else {
                contents = await ListDirectory(path);
            }

            setCurrentPath(path);
            const sorted = (contents || []).sort((a: FileNode, b: FileNode) => {
                if (a.is_dir === b.is_dir) return a.name.localeCompare(b.name);
                return a.is_dir ? -1 : 1;
            });
            setFiles(sorted);
        } catch (err: any) {
            setFsError(err.message || "Permission Denied or Folder Not Found");
        }
    };

    const handleGoUp = () => {
        if (currentPath === "") return;
        const parts = currentPath.split(/[\\/]/).filter(Boolean);
        if (parts.length <= 1) {
            loadRootPaths();
        } else {
            parts.pop();
            const separator = currentPath.includes('\\') ? '\\' : '/';
            let newPath = parts.join(separator);
            if (newPath.length === 2 && newPath.endsWith(':')) newPath += separator; 
            handleNavigate(newPath);
        }
    };

    const browseRemoteDevice = (device: NetworkDevice) => {
        setTargetDevice(device);
        setActiveTab('files');
    };

    // --- NEW: DOWNLOAD LOGIC ---
    const handleDownload = (filePath: string) => {
        if (!targetDevice) {
            alert("File is already on your local PC.");
            return;
        }
        // Direct browser download stream
        const downloadUrl = `http://${targetDevice.ip}:${targetDevice.port}/api/fs/download?path=${encodeURIComponent(filePath)}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // --- NEW: UPLOAD LOGIC ---
    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !targetDevice || currentPath === "") return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`http://${targetDevice.ip}:${targetDevice.port}/api/fs/upload?path=${encodeURIComponent(currentPath)}`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed.");
            
            // Refresh the directory to show the new file
            handleNavigate(currentPath);
        } catch (error) {
            alert("Error uploading file.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
        }
    };

    return (
        <div className="app-container">
            <div className="sidebar">
                <div className="sidebar-header">🌐 VEDA Explorer</div>
                <ul className="sidebar-menu">
                    <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>🏠 Dashboard</li>
                    <li className={activeTab === 'files' ? 'active' : ''} onClick={() => { setTargetDevice(null); setActiveTab('files'); }}>📁 Files (Local)</li>
                    <li className={activeTab === 'devices' ? 'active' : ''} onClick={() => setActiveTab('devices')}>💻 Devices</li>
                    <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>⚙️ Settings</li>
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
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>CPU Usage</span><span>{stats.cpu_usage.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#333', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                                            <div style={{ width: `${stats.cpu_usage}%`, backgroundColor: '#4CAF50', height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>RAM</span><span>{formatGB(stats.ram_used)} / {formatGB(stats.ram_total)}</span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#333', height: '8px', borderRadius: '4px', marginTop: '5px' }}>
                                            <div style={{ width: `${(stats.ram_used / stats.ram_total) * 100}%`, backgroundColor: '#2196F3', height: '100%', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span>Storage (Root/C:)</span><span>{formatGB(stats.disk_used)} / {formatGB(stats.disk_total)}</span>
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

                {/* --- FILES TAB --- */}
                {activeTab === 'files' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2 style={{ color: targetDevice ? '#2196F3' : '#ffffff' }}>
                                {targetDevice ? `🌐 Remote Explorer: ${targetDevice.hostname}` : '💻 Local File Explorer'}
                            </h2>
                            {targetDevice && (
                                <button onClick={() => setTargetDevice(null)} style={{ padding: '8px 15px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>
                                    ❌ Exit Remote View
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #333' }}>
                            <button onClick={currentPath === "" ? loadRootPaths : handleGoUp} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>⬆️ Up</button>
                            
                            <div style={{ flex: 1, padding: '6px 12px', backgroundColor: '#121212', borderRadius: '4px', border: '1px solid #444', fontFamily: 'monospace' }}>
                                {currentPath === "" ? "Drive Selection" : currentPath}
                            </div>
                            
                            <button onClick={() => currentPath === "" ? loadRootPaths() : handleNavigate(currentPath)} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>🔄 Refresh</button>
                            
                            {/* Upload Button - Only visible when browsing a specific remote directory */}
                            {targetDevice && currentPath !== "" && (
                                <>
                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={onFileSelected} />
                                    <button 
                                        onClick={handleUploadClick} 
                                        disabled={isUploading}
                                        style={{ padding: '6px 12px', cursor: isUploading ? 'wait' : 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
                                    >
                                        {isUploading ? "Uploading..." : "⬆️ Upload File"}
                                    </button>
                                </>
                            )}
                        </div>
                        
                        {fsError && <div style={{ color: '#ff5555', padding: '10px', backgroundColor: '#330000', borderRadius: '4px', marginBottom: '10px' }}>{fsError}</div>}
                        
                        <div style={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: '6px', border: '1px solid #333', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#2a2a2a', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #444' }}>Name</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #444', width: '150px' }}>Date Modified</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid #444', width: '100px', textAlign: 'right' }}>Size</th>
                                        {targetDevice && <th style={{ padding: '12px', borderBottom: '1px solid #444', width: '80px', textAlign: 'center' }}>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {files.map((file, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #2a2a2a' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td 
                                                onClick={() => file.is_dir ? handleNavigate(file.path) : null}
                                                style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: file.is_dir ? 'pointer' : 'default' }}
                                            >
                                                <span>{file.is_dir ? '📁' : '📄'}</span><span style={{ color: file.is_dir ? '#64b5f6' : '#ffffff' }}>{file.name}</span>
                                            </td>
                                            <td style={{ padding: '12px', color: '#aaaaaa', fontSize: '13px' }}>{file.mod_time}</td>
                                            <td style={{ padding: '12px', color: '#aaaaaa', fontSize: '13px', textAlign: 'right' }}>{!file.is_dir ? formatKB(file.size) : ''}</td>
                                            
                                            {/* Download Button Column */}
                                            {targetDevice && (
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    {!file.is_dir && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(file.path); }}
                                                            style={{ padding: '4px 8px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
                                                            title="Download File"
                                                        >
                                                            ⬇️
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {files.length === 0 && <tr><td colSpan={targetDevice ? 4 : 3} style={{ padding: '20px', textAlign: 'center', color: '#aaaaaa' }}>This folder is empty.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- DEVICES TAB --- */}
                {activeTab === 'devices' && (
                    <div>
                        <h2>Paired Devices</h2>
                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '40px' }}>
                            {pairedDevices.length === 0 ? <p style={{ color: '#aaaaaa' }}>No devices paired yet.</p> : pairedDevices.map((device, i) => (
                                <div key={i} className="dashboard-card" style={{ marginTop: '10px', minWidth: '250px' }}>
                                    <h3 style={{ color: '#4CAF50' }}>✓ {device.hostname}</h3>
                                    <p style={{ color: '#aaaaaa', fontSize: '14px', marginTop: '5px', marginBottom: '15px' }}>{device.ip}</p>
                                    <button 
                                        onClick={() => browseRemoteDevice(device)}
                                        style={{ width: '100%', padding: '8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        🌐 Browse Files
                                    </button>
                                </div>
                            ))}
                        </div>
                        <h2>Discover New Devices</h2>
                        <button onClick={handleScanNetwork} disabled={isScanning} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', margin: '15px 0' }}>{isScanning ? "Scanning (3s)..." : "🔍 Scan Network"}</button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {discoveredDevices.map((device, index) => (
                                <div key={index} style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '6px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div><h3 style={{ margin: '0 0 5px 0' }}>🖥️ {device.hostname}</h3><p style={{ margin: 0, color: '#aaaaaa', fontSize: '14px' }}>IP: {device.ip}</p></div>
                                    {!isPaired(device.hostname) ? <button onClick={() => handlePair(device)} style={{ padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pair Device</button> : <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Paired</span>}
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