//#region src/date-helper.ts
function e(e, t) {
	let n = new Date(e);
	return n.setUTCDate(n.getUTCDate() + t), n;
}
function t(e, t) {
	let n = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()), r = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
	return Math.round((n - r) / (1440 * 60 * 1e3));
}
function n(e) {
	return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
}
function r(e) {
	return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999));
}
function i(e, t) {
	let n = e.getTime();
	return n >= t.start.getTime() && n <= t.end.getTime();
}
//#endregion
//#region src/years.ts
var a = [];
a[1975] = [
	31,
	31,
	32,
	32,
	31,
	30,
	30,
	29,
	30,
	29,
	30,
	30,
	365
], a[1976] = [
	31,
	32,
	31,
	32,
	31,
	30,
	30,
	30,
	29,
	29,
	30,
	31,
	366
], a[1977] = [
	30,
	32,
	31,
	32,
	31,
	31,
	29,
	30,
	30,
	29,
	29,
	31,
	365
], a[1978] = [
	31,
	31,
	32,
	31,
	31,
	31,
	30,
	29,
	30,
	29,
	30,
	30,
	365
], a[1979] = a[1975], a[1980] = a[1976], a[1981] = [
	31,
	31,
	31,
	32,
	31,
	31,
	29,
	30,
	30,
	29,
	29,
	31,
	365
], a[1982] = a[1978], a[1983] = a[1975], a[1984] = a[1976], a[1985] = [
	31,
	31,
	31,
	32,
	31,
	31,
	29,
	30,
	30,
	29,
	30,
	30,
	365
], a[1986] = a[1978], a[1987] = [
	31,
	32,
	31,
	32,
	31,
	30,
	30,
	29,
	30,
	29,
	30,
	30,
	365
], a[1988] = a[1976], a[1989] = [
	31,
	31,
	31,
	32,
	31,
	31,
	30,
	29,
	30,
	29,
	30,
	30,
	365
], a[1990] = a[1978], a[1991] = [
	31,
	32,
	31,
	32,
	31,
	30,
	30,
	30,
	29,
	29,
	30,
	30,
	365
], a[1992] = [
	31,
	32,
	31,
	32,
	31,
	30,
	30,
	30,
	29,
	30,
	29,
	31,
	366
], a[1993] = a[1989], a[1994] = a[1978], a[1995] = a[1991], a[1996] = a[1992], a[1997] = a[1978], a[1998] = [
	31,
	31,
	32,
	31,
	32,
	30,
	30,
	29,
	30,
	29,
	30,
	30,
	365
], a[1999] = a[1976], a[2e3] = [
	30,
	32,
	31,
	32,
	31,
	30,
	30,
	30,
	29,
	30,
	29,
	31,
	365
], a[2001] = a[1978], a[2002] = a[1975], a[2003] = a[1976], a[2004] = a[2e3], a[2005] = a[1978], a[2006] = a[1975], a[2007] = a[1976], a[2008] = a[1981], a[2009] = a[1978], a[2010] = a[1975], a[2011] = a[1976], a[2012] = a[1985], a[2013] = a[1978], a[2014] = a[1975], a[2015] = a[1976], a[2016] = a[1985], a[2017] = a[1978], a[2018] = a[1987], a[2019] = a[1992], a[2020] = a[1989], a[2021] = a[1978], a[2022] = a[1991], a[2023] = a[1992], a[2024] = a[1989], a[2025] = a[1978], a[2026] = a[1976], a[2027] = a[2e3], a[2028] = a[1978], a[2029] = a[1998], a[2030] = a[1976], a[2031] = a[2e3], a[2032] = a[1978], a[2033] = a[1975], a[2034] = a[1976], a[2035] = a[1977], a[2036] = a[1978], a[2037] = a[1975], a[2038] = a[1976], a[2039] = a[1985], a[2040] = a[1978], a[2041] = a[1975], a[2042] = a[1976], a[2043] = a[1985], a[2044] = a[1978], a[2045] = a[1987], a[2046] = a[1976], a[2047] = a[1989], a[2048] = a[1978], a[2049] = a[1991], a[2050] = a[1992], a[2051] = a[1989], a[2052] = a[1978], a[2053] = a[1991], a[2054] = a[1992], a[2055] = a[1978], a[2056] = a[1998], a[2057] = a[1976], a[2058] = a[2e3], a[2059] = a[1978], a[2060] = a[1975], a[2061] = a[1976], a[2062] = [
	30,
	32,
	31,
	32,
	31,
	31,
	29,
	30,
	29,
	30,
	29,
	31,
	365
], a[2063] = a[1978], a[2064] = a[1975], a[2065] = a[1976], a[2066] = a[1981], a[2067] = a[1978], a[2068] = a[1975], a[2069] = a[1976], a[2070] = a[1985], a[2071] = a[1978], a[2072] = a[1987], a[2073] = a[1976], a[2074] = a[1989], a[2075] = a[1978], a[2076] = a[1991], a[2077] = a[1992], a[2078] = a[1989], a[2079] = a[1978], a[2080] = a[1991], a[2081] = a[1992], a[2082] = a[1978], a[2083] = a[1978], a[2084] = a[1976], a[2085] = a[2e3], a[2086] = a[1978], a[2087] = a[1975], a[2088] = a[1976], a[2089] = a[2e3], a[2090] = a[1978], a[2091] = a[1975], a[2092] = a[1976], a[2093] = a[1981], a[2094] = a[1978], a[2095] = a[1975], a[2096] = a[1976], a[2097] = a[1985], a[2098] = a[1978], a[2099] = a[1975];
//#endregion
//#region src/index.ts
var o = class {
	epochStart = new Date(Date.UTC(1918, 3, 13));
	epochEnd = new Date(Date.UTC(2043, 3, 13));
	errorMsg = "The input date is out of supported range.";
	year;
	month;
	day;
	constructor(e) {
		let [t, n, r] = this.parse(e);
		this.year = t, this.month = n, this.day = r;
	}
	parse(e) {
		let [t, n, r] = this.toEnglishDigits(e).replace(/[./|,]/g, "-").trim().split("-").map(Number);
		return [
			t,
			n,
			r
		];
	}
	toEnglishDigits(e) {
		let t = [
			"०",
			"१",
			"२",
			"३",
			"४",
			"५",
			"६",
			"७",
			"८",
			"९"
		];
		return e.replace(/[०१२३४५६७८९]/g, (e) => t.indexOf(e).toString());
	}
	toDayName(e) {
		return [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"
		][e];
	}
	toAdDate(t, n, r) {
		let i = 0;
		for (let e = 1975; e < t; e++) i += a[e][12];
		for (let e = 0; e < n - 1; e++) i += a[t][e];
		return i += r - 1, e(this.epochStart, i);
	}
	toBsDate(e) {
		let t = e;
		for (let e in a) {
			if (t >= a[e][12]) {
				t -= a[e][12];
				continue;
			}
			for (let n = 0; n < 12; n++) {
				if (t >= a[e][n]) {
					t -= a[e][n];
					continue;
				}
				return {
					year: Number(e),
					month: n + 1,
					date: t + 1
				};
			}
		}
		throw Error(this.errorMsg);
	}
	toAd() {
		if (this.year < 1975 || this.year > 2099) throw Error(this.errorMsg);
		let e = this.toAdDate(this.year, this.month, this.day);
		return {
			year: e.getFullYear(),
			month: e.getMonth() + 1,
			date: e.getDate(),
			day: this.toDayName(e.getDay())
		};
	}
	toBs() {
		let e = new Date(Date.UTC(this.year, this.month - 1, this.day));
		if (!i(e, {
			start: n(this.epochStart),
			end: r(this.epochEnd)
		})) throw Error(this.errorMsg);
		let a = t(e, this.epochStart);
		return {
			...this.toBsDate(a),
			day: this.toDayName(e.getUTCDay())
		};
	}
};
//#endregion
export { o as default };

// Kalika modification: expose the bundled month-length table for validated UTC date-only arithmetic.
export { a as years };
