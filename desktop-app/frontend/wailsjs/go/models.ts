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

