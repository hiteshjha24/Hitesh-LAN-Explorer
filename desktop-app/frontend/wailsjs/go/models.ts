export namespace fs {
	
	export class FileNode {
	    name: string;
	    path: string;
	    size: number;
	    is_dir: boolean;
	    mod_time: string;
	
	    static createFrom(source: any = {}) {
	        return new FileNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	        this.is_dir = source["is_dir"];
	        this.mod_time = source["mod_time"];
	    }
	}

}

export namespace network {
	
	export class Device {
	    hostname: string;
	    ip: string;
	    port: number;
	
	    static createFrom(source: any = {}) {
	        return new Device(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hostname = source["hostname"];
	        this.ip = source["ip"];
	        this.port = source["port"];
	    }
	}

}

export namespace security {
	
	export class PairedDevice {
	    hostname: string;
	    ip: string;
	    port: number;
	
	    static createFrom(source: any = {}) {
	        return new PairedDevice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hostname = source["hostname"];
	        this.ip = source["ip"];
	        this.port = source["port"];
	    }
	}

}

export namespace system {
	
	export class SystemStats {
	    cpu_usage: number;
	    ram_total: number;
	    ram_used: number;
	    disk_total: number;
	    disk_used: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpu_usage = source["cpu_usage"];
	        this.ram_total = source["ram_total"];
	        this.ram_used = source["ram_used"];
	        this.disk_total = source["disk_total"];
	        this.disk_used = source["disk_used"];
	    }
	}

}

