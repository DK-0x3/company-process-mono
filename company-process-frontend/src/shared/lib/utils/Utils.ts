class UtilsClass {
	private isoDateRegex = /^\d{4}-\d{2}-\d{2}T/;

	public convertDates = <T>(obj: T): T => {
		if (obj === null || obj === undefined) return obj;

		if (typeof obj === 'string' && this.isoDateRegex.test(obj)) {
			return new Date(obj) as unknown as T;
		}

		if (Array.isArray(obj)) {
			return obj.map(this.convertDates) as unknown as T;
		}

		if (typeof obj === 'object') {
			const result: Record<string, any> = {};
			for (const key in obj) {
				result[key] = this.convertDates(obj[key]);
			}
			return result as T;
		}

		return obj;
	};
}

export const Utils = new UtilsClass();