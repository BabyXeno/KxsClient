const 展示 = (...args: any[]) => {
	console.log(...args);
};

class Logger {

	private getHeader(method: string) {
		return "[" + "KxsClient" + " - " + method + "]";
	}

	public log(...args: any[]) {
		// Convert args to string and join them
		const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
		展示(this.getHeader("LOG"), message);
	}

	public warn(...args: any[]) {
		const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
		展示(this.getHeader("WARN"), message);
	}

	public error(...args: any[]) {
		const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
		展示(this.getHeader("ERROR"), message);
	}
}

export {
	Logger
}