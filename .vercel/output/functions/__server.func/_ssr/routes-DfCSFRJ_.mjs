import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as RotateCcw, c as Pause, d as Hand, f as Eraser, i as Shuffle, l as Paintbrush, n as Trash2, o as Plus, p as ChevronDown, r as SkipForward, s as Play, u as Minus } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DfCSFRJ_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ExprError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ExprError";
	}
};
var GLOBALS = /* @__PURE__ */ new Set([
	"t",
	"pop",
	"w",
	"h",
	"pi",
	"tau",
	"e"
]);
var BUILTIN_NAMES = [
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"atan2",
	"abs",
	"min",
	"max",
	"floor",
	"ceil",
	"round",
	"sqrt",
	"pow",
	"log",
	"exp",
	"sign",
	"clamp",
	"lerp",
	"mod",
	"hypot",
	"noise",
	"len",
	"sum",
	"avg",
	"if"
];
var RESERVED = /* @__PURE__ */ new Set([...GLOBALS, ...BUILTIN_NAMES]);
function isIdent(name) {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}
function emptyScope() {
	return { get(name) {
		if (GLOBALS.has(name)) return globalValue(name);
		if (RESERVED.has(name)) return {
			__bi: true,
			name
		};
	} };
}
function globalValue(name) {
	switch (name) {
		case "pi": return Math.PI;
		case "tau": return Math.PI * 2;
		case "e": return Math.E;
		default: return 0;
	}
}
var Parser = class {
	s;
	i = 0;
	constructor(s) {
		this.s = s;
	}
	parse() {
		if (!this.s.trim()) throw new ExprError("Empty expression");
		const ast = this.parseOr();
		this.skip();
		if (this.i < this.s.length) throw new ExprError(`Unexpected "${this.s[this.i]}"`);
		return ast;
	}
	parseOr() {
		let left = this.parseAnd();
		while (this.eat("||")) left = {
			t: "or",
			a: left,
			b: this.parseAnd()
		};
		return left;
	}
	parseAnd() {
		let left = this.parseCmp();
		while (this.eat("&&")) left = {
			t: "and",
			a: left,
			b: this.parseCmp()
		};
		return left;
	}
	parseCmp() {
		const left = this.parseAdd();
		for (const op of [
			"<=",
			">=",
			"==",
			"!=",
			"<",
			">"
		]) if (this.eat(op)) return {
			t: "bin",
			op,
			a: left,
			b: this.parseAdd()
		};
		return left;
	}
	parseAdd() {
		let left = this.parseMul();
		for (;;) if (this.eat("+")) left = {
			t: "bin",
			op: "+",
			a: left,
			b: this.parseMul()
		};
		else if (this.eat("-")) left = {
			t: "bin",
			op: "-",
			a: left,
			b: this.parseMul()
		};
		else break;
		return left;
	}
	parseMul() {
		let left = this.parseUnary();
		for (;;) if (this.eat("*")) left = {
			t: "bin",
			op: "*",
			a: left,
			b: this.parseUnary()
		};
		else if (this.eat("/")) left = {
			t: "bin",
			op: "/",
			a: left,
			b: this.parseUnary()
		};
		else if (this.eat("%")) left = {
			t: "bin",
			op: "%",
			a: left,
			b: this.parseUnary()
		};
		else break;
		return left;
	}
	parseUnary() {
		this.skip();
		if (this.s.startsWith("!=", this.i)) return this.parsePow();
		if (this.eat("+")) return this.parseUnary();
		if (this.eat("-")) return {
			t: "unary",
			op: "-",
			a: this.parseUnary()
		};
		if (this.eat("!")) return {
			t: "unary",
			op: "!",
			a: this.parseUnary()
		};
		return this.parsePow();
	}
	parsePow() {
		const left = this.parsePostfix();
		if (this.eat("^")) return {
			t: "bin",
			op: "^",
			a: left,
			b: this.parseUnary()
		};
		return left;
	}
	parsePostfix() {
		let ast = this.parsePrimary();
		for (;;) {
			if (this.eat(".")) {
				const name = this.readIdent();
				if (!name) throw new ExprError("Expected a name after \".\"");
				ast = {
					t: "member",
					obj: ast,
					name
				};
				continue;
			}
			if (this.eat("(")) {
				const args = [];
				this.skip();
				if (!this.eat(")")) for (;;) {
					args.push(this.parseOr());
					if (this.eat(")")) break;
					if (!this.eat(",")) throw new ExprError("Expected \",\" or \")\"");
				}
				if (ast.t === "name" && ast.name === "if") {
					if (args.length !== 3) throw new ExprError("if(condition, a, b) needs 3 arguments");
					ast = {
						t: "cond",
						c: args[0],
						a: args[1],
						b: args[2]
					};
				} else ast = {
					t: "call",
					callee: ast,
					args
				};
				continue;
			}
			if (this.eat("[")) {
				const i = this.parseOr();
				if (!this.eat("]")) throw new ExprError("Expected \"]\"");
				ast = {
					t: "index",
					obj: ast,
					i
				};
				continue;
			}
			break;
		}
		return ast;
	}
	parsePrimary() {
		this.skip();
		if (this.eat("(")) {
			const inner = this.parseOr();
			if (!this.eat(")")) throw new ExprError("Expected \")\"");
			return inner;
		}
		const num = this.readNumber();
		if (num !== null) return {
			t: "num",
			v: num
		};
		const ident = this.readIdent();
		if (ident) return {
			t: "name",
			name: ident
		};
		if (this.i >= this.s.length) throw new ExprError("Unexpected end of expression");
		throw new ExprError(`Unexpected "${this.s[this.i]}"`);
	}
	readNumber() {
		this.skip();
		const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(this.s.slice(this.i));
		if (!m) return null;
		this.i += m[0].length;
		return Number(m[0]);
	}
	readIdent() {
		this.skip();
		const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i));
		if (!m) return null;
		this.i += m[0].length;
		return m[0];
	}
	eat(tok) {
		this.skip();
		if (!this.s.startsWith(tok, this.i)) return false;
		const next = this.s[this.i + tok.length];
		if (/^[A-Za-z0-9_]$/.test(tok[0] ?? "") && next && /[A-Za-z0-9_]/.test(next)) return false;
		this.i += tok.length;
		return true;
	}
	skip() {
		while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i += 1;
	}
};
function compile(source) {
	const ast = new Parser(source).parse();
	const refs = [];
	collectRefs(ast, /* @__PURE__ */ new Set(), refs);
	return {
		ast,
		refs,
		eval(scope) {
			return evalAst(ast, scope);
		}
	};
}
function tryCompile(source) {
	try {
		return {
			program: compile(source),
			error: null
		};
	} catch (err) {
		return {
			program: null,
			error: err instanceof Error ? err.message : "Invalid expression"
		};
	}
}
function collectRefs(ast, params, out) {
	const push = (name) => {
		if (!params.has(name) && !out.includes(name)) out.push(name);
	};
	switch (ast.t) {
		case "num": return;
		case "name":
			push(ast.name);
			return;
		case "unary":
			collectRefs(ast.a, params, out);
			return;
		case "bin":
		case "and":
		case "or":
			collectRefs(ast.a, params, out);
			collectRefs(ast.b, params, out);
			return;
		case "cond":
			collectRefs(ast.c, params, out);
			collectRefs(ast.a, params, out);
			collectRefs(ast.b, params, out);
			return;
		case "call":
			collectRefs(ast.callee, params, out);
			for (const arg of ast.args) collectRefs(arg, params, out);
			return;
		case "member":
			collectRefs(ast.obj, params, out);
			return;
		case "index":
			collectRefs(ast.obj, params, out);
			collectRefs(ast.i, params, out);
			return;
	}
}
function lintExpr(source, known, params = []) {
	if (!source.trim()) return "Empty expression";
	let program;
	try {
		program = compile(source);
	} catch (err) {
		return err instanceof Error ? err.message : "Invalid expression";
	}
	const paramSet = new Set(params);
	for (const ref of program.refs) {
		if (paramSet.has(ref) || known.has(ref) || RESERVED.has(ref)) continue;
		return `Unknown name "${ref}"`;
	}
	return null;
}
function evalAst(ast, scope) {
	switch (ast.t) {
		case "num": return ast.v;
		case "name": {
			const v = scope.get(ast.name);
			if (v === void 0) throw new ExprError(`Unknown name "${ast.name}"`);
			return v;
		}
		case "unary": {
			const v = asNum(evalAst(ast.a, scope), "unary");
			if (ast.op === "-") return -v;
			return truthy(v) ? 0 : 1;
		}
		case "bin": return evalBin(ast.op, evalAst(ast.a, scope), ast.b, scope);
		case "and": {
			const left = evalAst(ast.a, scope);
			return truthy(left) ? evalAst(ast.b, scope) : left;
		}
		case "or": {
			const left = evalAst(ast.a, scope);
			return truthy(left) ? left : evalAst(ast.b, scope);
		}
		case "cond": return truthy(evalAst(ast.c, scope)) ? evalAst(ast.a, scope) : evalAst(ast.b, scope);
		case "call": return evalCall(evalAst(ast.callee, scope), ast.args, scope);
		case "member": {
			const obj = evalAst(ast.obj, scope);
			if (!isNamespace(obj)) throw new ExprError("Cannot read a field of a non-engine");
			const member = obj.members[ast.name];
			if (member === void 0) throw new ExprError(`${obj.name} has no "${ast.name}"`);
			return member;
		}
		case "index": {
			const obj = evalAst(ast.obj, scope);
			const index = asNum(evalAst(ast.i, scope), "index");
			if (!Array.isArray(obj)) throw new ExprError("Only arrays can be indexed");
			const i = Math.trunc(index);
			if (i < 0 || i >= obj.length) return 0;
			return obj[i] ?? 0;
		}
	}
}
function evalBin(op, left, rightAst, scope) {
	if (op === "==" || op === "!=") {
		const same = sameValue(left, evalAst(rightAst, scope));
		return op === "==" ? same ? 1 : 0 : same ? 0 : 1;
	}
	const a = asNum(left, "left side");
	const b = asNum(evalAst(rightAst, scope), "right side");
	switch (op) {
		case "+": return a + b;
		case "-": return a - b;
		case "*": return a * b;
		case "/": return b === 0 ? NaN : a / b;
		case "%": return b === 0 ? NaN : a % b;
		case "^": return a ** b;
		case "<": return a < b ? 1 : 0;
		case ">": return a > b ? 1 : 0;
		case "<=": return a <= b ? 1 : 0;
		case ">=": return a >= b ? 1 : 0;
		default: throw new ExprError(`Unknown operator "${op}"`);
	}
}
function evalCall(callee, argAsts, scope) {
	if (isFn(callee)) {
		const locals = {};
		callee.params.forEach((name, i) => {
			locals[name] = i < argAsts.length ? evalAst(argAsts[i], scope) : 0;
		});
		return evalAst(callee.body, { get(name) {
			if (name in locals) return locals[name];
			return callee.scope.get(name);
		} });
	}
	if (isBuiltin(callee)) {
		const args = argAsts.map((a) => evalAst(a, scope));
		return callBuiltin(callee.name, args);
	}
	throw new ExprError("That value is not a function");
}
function callBuiltin(name, args) {
	const n = (i) => asNum(args[i], name);
	switch (name) {
		case "sin": return Math.sin(n(0));
		case "cos": return Math.cos(n(0));
		case "tan": return Math.tan(n(0));
		case "asin": return Math.asin(clampUnit(n(0)));
		case "acos": return Math.acos(clampUnit(n(0)));
		case "atan": return Math.atan(n(0));
		case "atan2": return Math.atan2(n(0), n(1));
		case "abs": return Math.abs(n(0));
		case "floor": return Math.floor(n(0));
		case "ceil": return Math.ceil(n(0));
		case "round": return Math.round(n(0));
		case "sqrt": return Math.sqrt(Math.max(0, n(0)));
		case "pow": return n(0) ** n(1);
		case "log": return Math.log(Math.max(1e-9, n(0)));
		case "exp": return Math.exp(n(0));
		case "sign": return Math.sign(n(0));
		case "clamp": return Math.min(n(2), Math.max(n(1), n(0)));
		case "lerp": return n(0) + (n(1) - n(0)) * n(2);
		case "mod": {
			const b = n(1);
			if (b === 0) return NaN;
			return (n(0) % b + b) % b;
		}
		case "hypot": return Math.hypot(n(0), args.length > 1 ? n(1) : 0);
		case "noise": return valueNoise(n(0), args.length > 1 ? n(1) : 0);
		case "len": return asArray(args[0], name).length;
		case "sum": return asArray(args[0], name).reduce((s, v) => s + v, 0);
		case "avg": {
			const arr = asArray(args[0], name);
			if (!arr.length) return 0;
			return arr.reduce((s, v) => s + v, 0) / arr.length;
		}
		case "min": return reduceMinMax(args, "min");
		case "max": return reduceMinMax(args, "max");
		default: throw new ExprError(`Unknown function "${name}"`);
	}
}
function reduceMinMax(args, kind) {
	let list = [];
	if (args.length === 1 && Array.isArray(args[0])) list = args[0];
	else list = args.map((a, i) => asNum(a, `${kind} arg ${i + 1}`));
	if (!list.length) return 0;
	return kind === "min" ? Math.min(...list) : Math.max(...list);
}
function valueNoise(x, y) {
	const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return n - Math.floor(n);
}
function clampUnit(v) {
	return Math.min(1, Math.max(-1, v));
}
function asNum(v, where) {
	if (typeof v !== "number" || Number.isNaN(v)) throw new ExprError(`${where} is not a number`);
	return v;
}
function asArray(v, where) {
	if (!Array.isArray(v)) throw new ExprError(`${where} expects an array`);
	return v;
}
function truthy(v) {
	if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
	if (Array.isArray(v)) return v.length > 0;
	return true;
}
function sameValue(a, b) {
	if (typeof a === "number" && typeof b === "number") return a === b;
	return false;
}
function isFn(v) {
	return typeof v === "object" && v !== null && "__fn" in v;
}
function isNamespace(v) {
	return typeof v === "object" && v !== null && "__ns" in v;
}
function isBuiltin(v) {
	return typeof v === "object" && v !== null && "__bi" in v;
}
function evaluate(ast, scope) {
	return evalAst(ast, scope);
}
function evalNumber(source, scope = emptyScope()) {
	return asNum(compile(source).eval(scope), "value");
}
var seq = 0;
function uid(prefix) {
	seq += 1;
	return `${prefix}_${(Date.now() + seq).toString(36)}_${seq.toString(36)}`;
}
function blankEngine(existing) {
	const names = new Set(existing.map((e) => e.name));
	let name = "Engine";
	let n = existing.length + 1;
	while (names.has(name) || RESERVED.has(name)) {
		n += 1;
		name = `Engine${n}`;
	}
	return {
		id: uid("eng"),
		name,
		enabled: true,
		reads: [],
		variables: [{
			id: uid("var"),
			name: "n",
			initial: "0",
			update: "n + 1"
		}],
		values: [{
			id: uid("val"),
			name: "out",
			expr: "sin(n / 8)"
		}],
		functions: [{
			id: uid("fn"),
			name: "field",
			params: "x, y",
			expr: "sin(x * 0.2 + n * 0.05) * sin(y * 0.2)"
		}],
		arrays: [{
			id: uid("arr"),
			name: "seq",
			values: "1, 2, 3"
		}],
		effect: { type: "none" }
	};
}
var STARTER_ENGINES = [
	{
		id: "eng_clock",
		name: "Clock",
		enabled: true,
		reads: [],
		variables: [{
			id: "var_phase",
			name: "phase",
			initial: "0",
			update: "mod(phase + 0.05, tau)"
		}],
		values: [{
			id: "val_swing",
			name: "swing",
			expr: "sin(phase)"
		}],
		functions: [{
			id: "fn_tide",
			name: "tide",
			params: "x, y",
			expr: "sin(x * 0.15 + phase) * cos(y * 0.12 - phase * 0.5)"
		}],
		arrays: [],
		effect: {
			type: "tint",
			source: "tide"
		}
	},
	{
		id: "eng_season",
		name: "Season",
		enabled: true,
		reads: ["eng_clock"],
		variables: [],
		values: [{
			id: "val_rate",
			name: "rate",
			expr: "clamp(8 + 6 * Clock.swing, 2, 22)"
		}],
		functions: [],
		arrays: [],
		effect: {
			type: "speed",
			source: "rate"
		}
	},
	{
		id: "eng_courier",
		name: "Courier",
		enabled: true,
		reads: ["eng_clock"],
		variables: [],
		values: [
			{
				id: "val_go",
				name: "go",
				expr: "Clock.swing > 0.97"
			},
			{
				id: "val_px",
				name: "px",
				expr: "mod(12 + t * 0.4, w - 20)"
			},
			{
				id: "val_py",
				name: "py",
				expr: "h * 0.72 + 6 * Clock.swing"
			}
		],
		functions: [],
		arrays: [],
		effect: {
			type: "inject",
			source: "go",
			pattern: "glider"
		}
	},
	{
		id: "eng_ash",
		name: "Ash",
		enabled: false,
		reads: ["eng_clock"],
		variables: [],
		values: [{
			id: "val_p",
			name: "births",
			expr: "0.35 + 0.45 * (Clock.swing * 0.5 + 0.5)"
		}],
		functions: [],
		arrays: [],
		effect: {
			type: "seed",
			source: "births"
		}
	},
	{
		id: "eng_highlife",
		name: "HighLifeRule",
		enabled: false,
		reads: [],
		variables: [],
		values: [],
		functions: [],
		arrays: [{
			id: "arr_birth",
			name: "birth",
			values: "3, 6"
		}, {
			id: "arr_survive",
			name: "survive",
			values: "2, 3"
		}],
		effect: {
			type: "rule",
			birth: "birth",
			survive: "survive"
		}
	}
];
function parseNumberList(text) {
	const parts = text.split(/[, ]+/).map((p) => p.trim()).filter(Boolean);
	if (!parts.length) return {
		values: [],
		error: "Add at least one number"
	};
	const values = [];
	for (const part of parts) {
		const n = Number(part);
		if (!Number.isFinite(n)) return {
			values: [],
			error: `"${part}" is not a number`
		};
		values.push(n);
	}
	return {
		values,
		error: null
	};
}
function parseParams(text) {
	const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
	const seen = /* @__PURE__ */ new Set();
	for (const part of parts) {
		if (!isIdent(part)) return {
			params: [],
			error: `"${part}" is not a valid parameter`
		};
		if (seen.has(part)) return {
			params: [],
			error: `Duplicate parameter "${part}"`
		};
		seen.add(part);
	}
	return {
		params: parts,
		error: null
	};
}
function knownNames(engine, engines) {
	const known = /* @__PURE__ */ new Set();
	for (const v of engine.variables) if (isIdent(v.name)) known.add(v.name);
	for (const v of engine.values) if (isIdent(v.name)) known.add(v.name);
	for (const f of engine.functions) if (isIdent(f.name)) known.add(f.name);
	for (const a of engine.arrays) if (isIdent(a.name)) known.add(a.name);
	for (const id of engine.reads) {
		const other = engines.find((e) => e.id === id);
		if (other && isIdent(other.name)) known.add(other.name);
	}
	return known;
}
function engineIssues(engine, engines) {
	const issues = [];
	if (!isIdent(engine.name)) issues.push({
		field: "name",
		message: "Use a name like Clock or Drift"
	});
	else if (RESERVED.has(engine.name)) issues.push({
		field: "name",
		message: "That name is reserved"
	});
	else if (engines.some((e) => e.id !== engine.id && e.name === engine.name)) issues.push({
		field: "name",
		message: "Another engine already uses this name"
	});
	const names = /* @__PURE__ */ new Map();
	const claim = (kind, id, name) => {
		if (!name.trim()) {
			issues.push({
				field: id,
				message: "Name required"
			});
			return;
		}
		if (!isIdent(name)) {
			issues.push({
				field: id,
				message: "Letters, numbers, and underscore only"
			});
			return;
		}
		if (RESERVED.has(name)) {
			issues.push({
				field: id,
				message: `"${name}" is reserved`
			});
			return;
		}
		if (names.get(name)) issues.push({
			field: id,
			message: `"${name}" is already used in this engine`
		});
		else names.set(name, kind);
	};
	for (const v of engine.variables) claim("var", v.id, v.name);
	for (const v of engine.values) claim("val", v.id, v.name);
	for (const f of engine.functions) claim("fn", f.id, f.name);
	for (const a of engine.arrays) claim("arr", a.id, a.name);
	const known = knownNames(engine, engines);
	for (const v of engine.variables) {
		if (!v.initial.trim()) issues.push({
			field: `${v.id}:initial`,
			message: "Initial value required"
		});
		else {
			const err = lintExpr(v.initial, /* @__PURE__ */ new Set());
			if (err) issues.push({
				field: `${v.id}:initial`,
				message: err
			});
		}
		if (v.update.trim()) {
			const err = lintExpr(v.update, known);
			if (err) issues.push({
				field: `${v.id}:update`,
				message: err
			});
		}
	}
	for (const v of engine.values) {
		const err = v.expr.trim() ? lintExpr(v.expr, known) : "Empty expression";
		if (err) issues.push({
			field: v.id,
			message: err
		});
	}
	for (const f of engine.functions) {
		const params = parseParams(f.params);
		if (params.error) issues.push({
			field: `${f.id}:params`,
			message: params.error
		});
		const err = f.expr.trim() ? lintExpr(f.expr, known, params.params) : "Empty expression";
		if (err) issues.push({
			field: f.id,
			message: err
		});
	}
	for (const a of engine.arrays) {
		const parsed = parseNumberList(a.values);
		if (parsed.error) issues.push({
			field: a.id,
			message: parsed.error
		});
	}
	const effect = engine.effect;
	if (effect.type === "speed" || effect.type === "seed" || effect.type === "inject") {
		if (!effect.source) issues.push({
			field: "effect",
			message: "Choose a value to drive this effect"
		});
	}
	if (effect.type === "tint" || effect.type === "nudge") {
		if (!effect.source) issues.push({
			field: "effect",
			message: "Choose a function"
		});
		else if (!engine.functions.some((f) => f.name === effect.source)) issues.push({
			field: "effect",
			message: `No function named "${effect.source}"`
		});
	}
	if (effect.type === "rule") {
		if (!effect.birth && !effect.survive) issues.push({
			field: "effect",
			message: "Choose a birth or survive array"
		});
	}
	return issues;
}
function compileEngine(engine) {
	const hard = engineIssues(engine, [engine]).find((i) => i.field === "name" || engine.variables.some((v) => v.id === i.field));
	try {
		const variables = engine.variables.map((v) => ({
			id: v.id,
			name: v.name,
			initial: tryCompile(v.initial || "0").program ?? compileSafe("0"),
			update: v.update.trim() ? tryCompile(v.update).program : null
		}));
		const values = engine.values.map((v) => {
			const compiled = tryCompile(v.expr);
			return {
				id: v.id,
				name: v.name,
				prog: compiled.program ?? compileSafe("0"),
				bad: compiled.error
			};
		});
		const functions = [];
		for (const f of engine.functions) {
			const params = parseParams(f.params);
			const compiled = tryCompile(f.expr || "0");
			if (!compiled.program || params.error) continue;
			functions.push({
				name: f.name,
				params: params.params,
				body: compiled.program.ast
			});
		}
		const arrays = engine.arrays.map((a) => ({
			name: a.name,
			data: parseNumberList(a.values).values
		}));
		const valueOrder = orderValues(values.map((v) => v.name), values.map((v) => v.prog.refs));
		const badValue = values.find((v) => v.bad);
		return {
			variables: variables.map((v) => ({
				id: v.id,
				name: v.name,
				initial: v.initial,
				update: v.update
			})),
			values: values.map((v) => ({
				id: v.id,
				name: v.name,
				prog: v.prog
			})),
			valueOrder,
			functions,
			arrays,
			error: badValue?.bad ?? (valueOrder.length < values.length ? "Values depend on each other in a cycle" : null) ?? (hard ? hard.message : null)
		};
	} catch (err) {
		return {
			variables: [],
			values: [],
			valueOrder: [],
			functions: [],
			arrays: [],
			error: err instanceof Error ? err.message : "Could not compile engine"
		};
	}
}
function compileSafe(source) {
	const compiled = tryCompile(source);
	if (!compiled.program) throw new Error(compiled.error ?? "compile failed");
	return compiled.program;
}
function orderValues(names, refs) {
	const index = new Map(names.map((name, i) => [name, i]));
	const indeg = names.map(() => 0);
	const edges = names.map(() => []);
	names.forEach((name, i) => {
		for (const ref of refs[i] ?? []) {
			if (ref === name) continue;
			const from = index.get(ref);
			if (from === void 0) continue;
			edges[from].push(i);
			indeg[i] += 1;
		}
	});
	const queue = indeg.map((d, i) => d === 0 ? i : -1).filter((i) => i >= 0);
	const order = [];
	for (let q = 0; q < queue.length; q += 1) {
		const i = queue[q];
		order.push(i);
		for (const j of edges[i]) {
			indeg[j] -= 1;
			if (indeg[j] === 0) queue.push(j);
		}
	}
	return order.length === names.length ? order : order;
}
function rewriteRefs(engines, from, to) {
	if (!isIdent(from) || !isIdent(to) || from === to) return engines;
	const re = new RegExp(`\\b${from}\\.`, "g");
	const swap = (s) => s.replace(re, `${to}.`);
	return engines.map((e) => ({
		...e,
		variables: e.variables.map((v) => ({
			...v,
			initial: swap(v.initial),
			update: swap(v.update)
		})),
		values: e.values.map((v) => ({
			...v,
			expr: swap(v.expr)
		})),
		functions: e.functions.map((f) => ({
			...f,
			expr: swap(f.expr)
		}))
	}));
}
function effectLabel(effect) {
	switch (effect.type) {
		case "none": return "Data only";
		case "speed": return "Drives speed";
		case "tint": return "Tints the field";
		case "nudge": return "Nudges cells";
		case "inject": return "Injects pattern";
		case "seed": return "Seeds cells";
		case "rule": return "Replaces rule";
	}
}
function initialNumber(source) {
	try {
		const n = evalNumber(source || "0");
		return Number.isFinite(n) ? n : 0;
	} catch {
		return 0;
	}
}
var RULE_PRESETS = [
	{
		id: "life",
		name: "Life",
		text: "B3/S23"
	},
	{
		id: "highlife",
		name: "HighLife",
		text: "B36/S23"
	},
	{
		id: "daynight",
		name: "Day & Night",
		text: "B3678/S34678"
	},
	{
		id: "seeds",
		name: "Seeds",
		text: "B2/S"
	},
	{
		id: "maze",
		name: "Maze",
		text: "B3/S12345"
	},
	{
		id: "coral",
		name: "Coral",
		text: "B3/S45678"
	},
	{
		id: "diamoeba",
		name: "Diamoeba",
		text: "B35678/S5678"
	},
	{
		id: "2x2",
		name: "2x2",
		text: "B36/S125"
	}
];
function maskFromDigits(digits) {
	let mask = 0;
	for (const ch of digits) {
		const n = ch.charCodeAt(0) - 48;
		if (n >= 0 && n <= 8) mask |= 1 << n;
	}
	return mask;
}
function parseRule(text) {
	const m = /^B([0-8]*)\/S([0-8]*)$/i.exec(text.replace(/\s/g, ""));
	if (!m) return null;
	return {
		birth: maskFromDigits(m[1]),
		survive: maskFromDigits(m[2])
	};
}
function formatRule(rule) {
	const digits = (mask) => {
		let s = "";
		for (let n = 0; n <= 8; n += 1) if (mask & 1 << n) s += String(n);
		return s;
	};
	return `B${digits(rule.birth)}/S${digits(rule.survive)}`;
}
function ruleFromCounts(birth, survive) {
	let b = 0;
	let s = 0;
	for (const n of birth) {
		const i = Math.trunc(n);
		if (i >= 0 && i <= 8) b |= 1 << i;
	}
	for (const n of survive) {
		const i = Math.trunc(n);
		if (i >= 0 && i <= 8) s |= 1 << i;
	}
	return {
		birth: b,
		survive: s
	};
}
var LIFE_RULE = {
	birth: 8,
	survive: 12
};
function stepLife(src, dst, cols, rows, rule, wrap) {
	let pop = 0;
	for (let y = 0; y < rows; y += 1) {
		const yUp = wrap ? y === 0 ? rows - 1 : y - 1 : y - 1;
		const yDn = wrap ? y === rows - 1 ? 0 : y + 1 : y + 1;
		const row = y * cols;
		const rowUp = yUp * cols;
		const rowDn = yDn * cols;
		const upOk = yUp >= 0;
		const dnOk = yDn >= 0 && yDn < rows;
		for (let x = 0; x < cols; x += 1) {
			const xL = wrap ? x === 0 ? cols - 1 : x - 1 : x - 1;
			const xR = wrap ? x === cols - 1 ? 0 : x + 1 : x + 1;
			let n = 0;
			if (upOk) {
				if (xL >= 0) n += src[rowUp + xL];
				n += src[rowUp + x];
				if (xR < cols) n += src[rowUp + xR];
			}
			if (xL >= 0) n += src[row + xL];
			if (xR < cols) n += src[row + xR];
			if (dnOk) {
				if (xL >= 0) n += src[rowDn + xL];
				n += src[rowDn + x];
				if (xR < cols) n += src[rowDn + xR];
			}
			const alive = src[row + x] === 1;
			const bit = 1 << n;
			const out = alive ? (rule.survive & bit) !== 0 : (rule.birth & bit) !== 0;
			dst[row + x] = out ? 1 : 0;
			if (out) pop += 1;
		}
	}
	return pop;
}
function countLive(cells) {
	let n = 0;
	for (let i = 0; i < cells.length; i += 1) if (cells[i]) n += 1;
	return n;
}
function paintCell(cells, cols, rows, x, y, alive, brush, wrap) {
	const r = Math.max(0, brush - 1 >> 1);
	const v = alive ? 1 : 0;
	for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
		let cx = x + dx;
		let cy = y + dy;
		if (wrap) {
			cx = (cx % cols + cols) % cols;
			cy = (cy % rows + rows) % rows;
		} else if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
		cells[cy * cols + cx] = v;
	}
}
function paintLine(cells, cols, rows, x0, y0, x1, y1, alive, brush, wrap) {
	let x = x0;
	let y = y0;
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const sx = x0 < x1 ? 1 : -1;
	const sy = y0 < y1 ? 1 : -1;
	let err = dx - dy;
	for (;;) {
		paintCell(cells, cols, rows, x, y, alive, brush, wrap);
		if (x === x1 && y === y1) break;
		const e2 = err * 2;
		if (e2 > -dy) {
			err -= dy;
			x += sx;
		}
		if (e2 < dx) {
			err += dx;
			y += sy;
		}
	}
}
function decodeRle(rle) {
	const body = rle.split("\n").filter((line) => !line.startsWith("x") && !line.startsWith("#")).join("").replace(/\s/g, "");
	const cells = [];
	let x = 0;
	let y = 0;
	let n = 0;
	let maxX = 0;
	for (const ch of body) {
		if (ch >= "0" && ch <= "9") {
			n = n * 10 + (ch.charCodeAt(0) - 48);
			continue;
		}
		const count = n || 1;
		n = 0;
		if (ch === "b") x += count;
		else if (ch === "o") {
			for (let i = 0; i < count; i += 1) cells.push({
				x: x + i,
				y
			});
			x += count;
			if (x > maxX) maxX = x;
		} else if (ch === "$") {
			if (x > maxX) maxX = x;
			y += count;
			x = 0;
		} else if (ch === "!") {
			if (x > maxX) maxX = x;
			break;
		}
	}
	return {
		w: maxX,
		h: y + (x > 0 ? 1 : 0),
		cells
	};
}
function pattern(id, name, rle) {
	return {
		id,
		name,
		rle,
		...decodeRle(rle)
	};
}
var PATTERNS = [
	pattern("glider", "Glider", "bo$2bo$3o!"),
	pattern("gosper", "Gosper gun", "24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!"),
	pattern("lwss", "LWSS", "bo2bo$o4b$o3bo$4o!"),
	pattern("pulsar", "Pulsar", "2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o2b!"),
	pattern("penta", "Pentadecathlon", "2bo4bo$2ob4ob2o$2bo4bo!"),
	pattern("acorn", "Acorn", "bo5b$3bo$2o2b3o!"),
	pattern("rpent", "R-pentomino", "b2o$2o$bo!"),
	pattern("diehard", "Diehard", "6bo$2o$bo3b3o!"),
	pattern("toad", "Toad", "b3o$3o!"),
	pattern("beacon", "Beacon", "2o2b$2o$2b2o$2b2o!"),
	pattern("blinker", "Blinker", "3o!"),
	pattern("block", "Block", "2o$2o!")
];
function patternById(id) {
	return PATTERNS.find((p) => p.id === id);
}
var useHud = create(() => ({
	generation: 0,
	population: 0,
	speed: 12,
	speedSource: null,
	rule: "B3/S23",
	ruleSource: null,
	readouts: {}
}));
var Simulation = class {
	cols = 160;
	rows = 100;
	cells;
	next;
	generation = 0;
	population = 0;
	rule = { ...LIFE_RULE };
	baseRule = { ...LIFE_RULE };
	wrap = true;
	baseSpeed = 12;
	speed = 12;
	ruleMode = "manual";
	density = .28;
	defs = [];
	field = /* @__PURE__ */ new Float32Array(1440);
	fieldActive = false;
	runtimes = /* @__PURE__ */ new Map();
	undoStack = [];
	namespaces = /* @__PURE__ */ new Map();
	constructor() {
		this.cells = new Uint8Array(this.cols * this.rows);
		this.next = new Uint8Array(this.cols * this.rows);
	}
	resize(cols, rows) {
		this.cols = cols;
		this.rows = rows;
		this.cells = new Uint8Array(cols * rows);
		this.next = new Uint8Array(cols * rows);
		this.generation = 0;
		this.population = 0;
		this.undoStack = [];
		this.fieldActive = false;
		this.field.fill(0);
	}
	pushUndo() {
		this.undoStack.push(this.cells.slice());
		if (this.undoStack.length > 30) this.undoStack.shift();
	}
	undo() {
		const prev = this.undoStack.pop();
		if (!prev || prev.length !== this.cells.length) return;
		this.cells.set(prev);
		this.population = countLive(this.cells);
		this.publish(true);
	}
	setDefs(defs) {
		this.defs = defs;
		const live = new Set(defs.map((d) => d.id));
		for (const id of this.runtimes.keys()) if (!live.has(id)) {
			this.runtimes.delete(id);
			this.namespaces.delete(id);
		}
		for (const def of defs) {
			const signature = JSON.stringify(def);
			let rt = this.runtimes.get(def.id);
			if (!rt || rt.signature !== signature) {
				const prevVars = rt?.varValues ?? {};
				const compiled = compileEngine(def);
				const varValues = {};
				for (const v of compiled.variables) varValues[v.id] = prevVars[v.id] ?? initialNumber(def.variables.find((d) => d.id === v.id)?.initial ?? "0");
				rt = {
					signature,
					compiled,
					varValues,
					latch: rt?.latch ?? false,
					history: rt?.history ?? [],
					namespace: {
						__ns: true,
						name: def.name,
						members: {}
					},
					error: compiled.error
				};
				this.runtimes.set(def.id, rt);
				this.namespaces.set(def.id, rt.namespace);
			}
		}
		const done = this.evaluate(false);
		this.applyScalar(done);
		this.publish(true);
	}
	resetEngine(id) {
		const def = this.defs.find((d) => d.id === id);
		const rt = this.runtimes.get(id);
		if (!def || !rt) return;
		for (const v of def.variables) rt.varValues[v.id] = initialNumber(v.initial);
		rt.latch = false;
		rt.history = [];
		const done = this.evaluate(false);
		this.applyScalar(done);
		this.publish(true);
	}
	resetAllEngines() {
		this.generation = 0;
		for (const def of this.defs) {
			const rt = this.runtimes.get(def.id);
			if (!rt) continue;
			for (const v of def.variables) rt.varValues[v.id] = initialNumber(v.initial);
			rt.latch = false;
			rt.history = [];
		}
		const done = this.evaluate(false);
		this.applyScalar(done);
		this.publish(true);
	}
	clearBoard() {
		this.pushUndo();
		this.cells.fill(0);
		this.population = 0;
		this.generation = 0;
		this.field.fill(0);
		this.fieldActive = false;
		this.publish(true);
	}
	randomize() {
		this.pushUndo();
		const p = this.density;
		for (let i = 0; i < this.cells.length; i += 1) this.cells[i] = Math.random() < p ? 1 : 0;
		this.population = countLive(this.cells);
		this.generation = 0;
		this.publish(true);
	}
	stamp(pattern, clear) {
		this.pushUndo();
		if (clear) this.cells.fill(0);
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const cell of pattern.cells) {
			if (cell.x < minX) minX = cell.x;
			if (cell.y < minY) minY = cell.y;
			if (cell.x > maxX) maxX = cell.x;
			if (cell.y > maxY) maxY = cell.y;
		}
		if (!Number.isFinite(minX)) return;
		const ox = Math.floor((this.cols - (maxX - minX + 1)) / 2) - minX;
		const oy = Math.floor((this.rows - (maxY - minY + 1)) / 2) - minY;
		this.blit(pattern, ox, oy, false);
		this.population = countLive(this.cells);
		if (clear) this.generation = 0;
		this.publish(true);
	}
	inject(patternId, x, y) {
		const pattern = patternById(patternId) ?? patternById("glider");
		if (!pattern) return;
		this.blit(pattern, Math.round(x), Math.round(y), true);
	}
	blit(pattern, ox, oy, respectWrap) {
		for (const cell of pattern.cells) {
			let x = ox + cell.x;
			let y = oy + cell.y;
			if (this.wrap && respectWrap) {
				x = (x % this.cols + this.cols) % this.cols;
				y = (y % this.rows + this.rows) % this.rows;
			} else if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
			else if (this.wrap) {
				x = (x % this.cols + this.cols) % this.cols;
				y = (y % this.rows + this.rows) % this.rows;
			}
			this.cells[y * this.cols + x] = 1;
		}
	}
	paintAt(x0, y0, x1, y1, alive, brush) {
		paintLine(this.cells, this.cols, this.rows, x0, y0, x1, y1, alive, brush, this.wrap);
		this.population = countLive(this.cells);
	}
	paintDot(x, y, alive, brush) {
		paintCell(this.cells, this.cols, this.rows, x, y, alive, brush, this.wrap);
		this.population = countLive(this.cells);
	}
	step() {
		this.generation += 1;
		const outputs = this.evaluate(true);
		this.applyScalar(outputs);
		this.population = stepLife(this.cells, this.next, this.cols, this.rows, this.rule, this.wrap);
		const swap = this.cells;
		this.cells = this.next;
		this.next = swap;
		this.applySpatial(outputs);
		this.population = countLive(this.cells);
		this.publish(false);
	}
	evaluate(advance) {
		const done = /* @__PURE__ */ new Map();
		const order = topo(this.defs);
		for (const def of order) {
			const rt = this.runtimes.get(def.id);
			if (!rt) continue;
			if (!def.enabled) {
				done.set(def.id, rt.namespace);
				continue;
			}
			try {
				if (advance) this.advanceVariables(def, rt, done);
				this.rebuildNamespace(def, rt, true, done, advance);
				rt.error = rt.compiled.error;
				done.set(def.id, rt.namespace);
			} catch (err) {
				rt.error = err instanceof Error ? err.message : "Engine failed";
				done.set(def.id, rt.namespace);
			}
		}
		return done;
	}
	advanceVariables(def, rt, done) {
		const prev = { ...rt.varValues };
		const scope = this.makeScope(def, rt, prev, done, {});
		for (const variable of rt.compiled.variables) {
			if (!variable.update) continue;
			const n = asNum(variable.update.eval(scope), variable.name);
			if (Number.isFinite(n)) rt.varValues[variable.id] = n;
		}
	}
	rebuildNamespace(def, rt, computeValues, done = /* @__PURE__ */ new Map(), recordHistory = false) {
		const locals = {};
		const scope = { get: (name) => {
			if (name in locals) return locals[name];
			return this.lookupOuter(def, name, done);
		} };
		for (const arr of rt.compiled.arrays) locals[arr.name] = arr.data;
		for (const fn of rt.compiled.functions) {
			const fv = {
				__fn: true,
				params: fn.params,
				body: fn.body,
				scope
			};
			locals[fn.name] = fv;
		}
		for (const variable of rt.compiled.variables) locals[variable.name] = rt.varValues[variable.id] ?? 0;
		const valueLocals = {};
		if (computeValues && !rt.compiled.error) {
			const valueScope = { get: (name) => {
				if (name in valueLocals) return valueLocals[name];
				return scope.get(name);
			} };
			for (const index of rt.compiled.valueOrder) {
				const value = rt.compiled.values[index];
				if (!value) continue;
				const n = asNum(value.prog.eval(valueScope), value.name);
				valueLocals[value.name] = Number.isFinite(n) ? n : 0;
				locals[value.name] = valueLocals[value.name];
			}
		} else for (const value of def.values) if (!(value.name in locals)) locals[value.name] = 0;
		rt.namespace = {
			__ns: true,
			name: def.name,
			members: { ...locals }
		};
		this.namespaces.set(def.id, rt.namespace);
		if (recordHistory && computeValues) {
			const primary = def.values[0] ? locals[def.values[0].name] : def.variables[0] ? rt.varValues[def.variables[0].id] : 0;
			if (typeof primary === "number" && Number.isFinite(primary)) {
				rt.history.push(primary);
				if (rt.history.length > 48) rt.history.shift();
			}
		}
	}
	lookupOuter(def, name, done) {
		for (const id of def.reads) if (this.defs.find((e) => e.id === id)?.name === name) return done.get(id) ?? this.namespaces.get(id);
		if (name === "t") return this.generation;
		if (name === "pop") return this.population;
		if (name === "w") return this.cols;
		if (name === "h") return this.rows;
		return emptyScope().get(name);
	}
	makeScope(def, rt, varSnapshot, done, extra) {
		const locals = { ...extra };
		for (const arr of rt.compiled.arrays) locals[arr.name] = arr.data;
		for (const variable of rt.compiled.variables) locals[variable.name] = varSnapshot[variable.id] ?? 0;
		const scope = { get: (name) => {
			if (name in locals) return locals[name];
			return this.lookupOuter(def, name, done);
		} };
		for (const fn of rt.compiled.functions) locals[fn.name] = {
			__fn: true,
			params: fn.params,
			body: fn.body,
			scope
		};
		return scope;
	}
	applyScalar(done) {
		let speed = this.baseSpeed;
		let speedSource = null;
		let rule = this.baseRule;
		let ruleSource = null;
		for (const def of this.defs) {
			if (!def.enabled) continue;
			const ns = done.get(def.id);
			if (!ns) continue;
			const effect = def.effect;
			if (effect.type === "speed") {
				const n = memberNum(ns, effect.source);
				if (n !== null) {
					speed = Math.min(40, Math.max(1, n));
					speedSource = def.name;
				}
			}
			if (effect.type === "rule" && this.ruleMode === "engine") {
				const birth = effect.birth ? memberArr(ns, effect.birth) : null;
				const survive = effect.survive ? memberArr(ns, effect.survive) : null;
				rule = ruleFromCounts(birth ?? countsFromMask(this.baseRule.birth), survive ?? countsFromMask(this.baseRule.survive));
				ruleSource = def.name;
			}
		}
		this.speed = speed;
		this.rule = rule;
		this.speedSource = speedSource;
		this.ruleSource = ruleSource;
	}
	speedSource = null;
	ruleSource = null;
	applySpatial(done) {
		let spatial = false;
		for (const def of this.defs) {
			if (!def.enabled) continue;
			const ns = done.get(def.id);
			const rt = this.runtimes.get(def.id);
			if (!ns || !rt) continue;
			const effect = def.effect;
			if (effect.type === "tint" || effect.type === "nudge") {
				const fn = ns.members[effect.source];
				if (!isFn(fn)) {
					rt.error = `No function "${effect.source}"`;
					continue;
				}
				const err = this.sampleField(fn);
				if (err) {
					rt.error = err;
					continue;
				}
				spatial = true;
				if (effect.type === "nudge") this.nudgeFromField();
			} else if (effect.type === "inject") {
				const level = memberNum(ns, effect.source);
				const hot = level !== null && level > .5;
				if (hot && !rt.latch) {
					const px = memberNum(ns, "px") ?? Math.floor(this.cols / 2);
					const py = memberNum(ns, "py") ?? Math.floor(this.rows / 2);
					this.inject(effect.pattern, px, py);
				}
				rt.latch = hot;
			} else if (effect.type === "seed") {
				const expected = memberNum(ns, effect.source);
				if (expected !== null && expected > 0) this.seed(Math.min(40, expected));
			}
		}
		if (!spatial) {
			this.fieldActive = false;
			this.field.fill(0);
		}
	}
	sampleField(fn) {
		try {
			callFn(fn, [0, 0]);
		} catch (err) {
			this.fieldActive = false;
			return err instanceof Error ? err.message : "Field failed";
		}
		this.fieldActive = true;
		const sx = this.cols / 48;
		const sy = this.rows / 30;
		try {
			for (let y = 0; y < 30; y += 1) for (let x = 0; x < 48; x += 1) this.field[y * 48 + x] = callFn(fn, [(x + .5) * sx, (y + .5) * sy]);
		} catch (err) {
			this.fieldActive = false;
			this.field.fill(0);
			return err instanceof Error ? err.message : "Field failed";
		}
		return null;
	}
	nudgeFromField() {
		const sx = this.cols / 48;
		const sy = this.rows / 30;
		for (let y = 0; y < 30; y += 1) for (let x = 0; x < 48; x += 1) {
			const v = this.field[y * 48 + x];
			if (v < .72 && v > -.72) continue;
			const alive = v >= .72 ? 1 : 0;
			const x0 = Math.floor(x * sx);
			const x1 = Math.min(this.cols, Math.floor((x + 1) * sx));
			const y0 = Math.floor(y * sy);
			const y1 = Math.min(this.rows, Math.floor((y + 1) * sy));
			for (let cy = y0; cy < y1; cy += 1) {
				const row = cy * this.cols;
				for (let cx = x0; cx < x1; cx += 1) this.cells[row + cx] = alive;
			}
		}
	}
	seed(expected) {
		const whole = Math.floor(expected);
		const n = whole + (Math.random() < expected - whole ? 1 : 0);
		for (let i = 0; i < n; i += 1) {
			const x = Math.random() * this.cols | 0;
			const y = Math.random() * this.rows | 0;
			this.cells[y * this.cols + x] = 1;
		}
	}
	sampleFieldAt(col, row) {
		if (!this.fieldActive) return 0;
		const x = Math.min(47, Math.max(0, col / this.cols * 48));
		const y = Math.min(29, Math.max(0, row / this.rows * 30));
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const x1 = Math.min(47, x0 + 1);
		const y1 = Math.min(29, y0 + 1);
		const tx = x - x0;
		const ty = y - y0;
		const a = this.field[y0 * 48 + x0];
		const b = this.field[y0 * 48 + x1];
		const c = this.field[y1 * 48 + x0];
		const d = this.field[y1 * 48 + x1];
		return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
	}
	publish(forceHistory) {
		const readouts = {};
		for (const def of this.defs) {
			const rt = this.runtimes.get(def.id);
			if (!rt) continue;
			const numbers = [];
			for (const variable of def.variables) numbers.push({
				name: variable.name,
				value: rt.varValues[variable.id] ?? 0
			});
			for (const value of def.values) {
				const member = rt.namespace.members[value.name];
				numbers.push({
					name: value.name,
					value: typeof member === "number" ? member : 0
				});
			}
			readouts[def.id] = {
				numbers,
				error: def.enabled ? rt.error : null,
				history: rt.history.slice(),
				paused: !def.enabled
			};
		}
		useHud.setState({
			generation: this.generation,
			population: this.population,
			speed: this.speed,
			speedSource: this.speedSource,
			rule: formatRule(this.rule),
			ruleSource: this.ruleMode === "engine" ? this.ruleSource : null,
			readouts
		});
	}
};
function topo(defs) {
	const byId = new Map(defs.map((d) => [d.id, d]));
	const indeg = new Map(defs.map((d) => [d.id, 0]));
	const edges = new Map(defs.map((d) => [d.id, []]));
	for (const def of defs) for (const read of def.reads) {
		if (!byId.has(read)) continue;
		edges.get(read)?.push(def.id);
		indeg.set(def.id, (indeg.get(def.id) ?? 0) + 1);
	}
	const queue = defs.filter((d) => (indeg.get(d.id) ?? 0) === 0);
	const out = [];
	for (let i = 0; i < queue.length; i += 1) {
		const def = queue[i];
		out.push(def);
		for (const next of edges.get(def.id) ?? []) {
			const left = (indeg.get(next) ?? 1) - 1;
			indeg.set(next, left);
			if (left === 0) {
				const node = byId.get(next);
				if (node) queue.push(node);
			}
		}
	}
	if (out.length < defs.length) {
		for (const def of defs) if (!out.includes(def)) out.push(def);
	}
	return out;
}
function memberNum(ns, name) {
	const v = ns.members[name];
	return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function memberArr(ns, name) {
	const v = ns.members[name];
	return Array.isArray(v) ? v : null;
}
function countsFromMask(mask) {
	const out = [];
	for (let n = 0; n <= 8; n += 1) if (mask & 1 << n) out.push(n);
	return out;
}
function callFn(fn, args) {
	const locals = {};
	fn.params.forEach((name, i) => {
		locals[name] = args[i] ?? 0;
	});
	const value = evaluate(fn.body, { get(name) {
		if (name in locals) return locals[name];
		return fn.scope.get(name);
	} });
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function EngineBay(props) {
	const { engines, mobileOpen } = props;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-3 pb-3 lg:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "btn btn-ghost w-full",
			onClick: () => props.onMobileOpen(!mobileOpen),
			children: mobileOpen ? "Hide engines" : `Engines · ${engines.length}`
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
		className: mobileOpen ? "flex max-h-[48dvh] min-h-0 w-full shrink-0 flex-col border-t border-line bg-surface lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l" : "hidden min-h-0 w-96 shrink-0 flex-col border-l border-line bg-surface lg:flex",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BayBody, { ...props })
	})] });
}
function BayBody({ engines, onChange, onReset, onResetAll, ruleMode }) {
	const [openId, setOpenId] = (0, import_react.useState)(engines[0]?.id ?? null);
	const cycle = hasCycle(engines);
	const patch = (id, next) => {
		onChange(engines.map((engine) => engine.id === id ? next : engine));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3 px-4 pt-4 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-medium tracking-tight",
					children: "Engines"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "Data that can drive the grid"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "btn btn-primary",
					onClick: () => {
						const next = blankEngine(engines);
						onChange([...engines, next]);
						setOpenId(next.id);
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
						className: "size-4",
						"aria-hidden": true
					}), "New"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
				className: "mx-4 mb-3 rounded-lg border border-line px-3 py-2 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
					className: "cursor-pointer font-medium text-fg",
					children: "How a connection works"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "pt-2 leading-normal",
					children: "Variables remember a number. Values and functions recompute every generation. Arrays stay fixed. Read another engine by name, as in Clock.swing, then bind an effect to speed, color, cells, or the rule."
				})]
			}),
			cycle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-4 mb-3 text-xs text-muted",
				children: "A read cycle uses the previous generation for the loop."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4",
				children: [
					engines.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-lg border border-line bg-bg px-3 py-4 text-sm text-muted",
						children: "No engines yet. Create one to generate data and wire it into the simulation."
					}) : null,
					engines.map((engine) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EngineCard, {
						engine,
						engines,
						open: openId === engine.id,
						ruleMode,
						onToggle: () => setOpenId((id) => id === engine.id ? null : engine.id),
						onChange: (next) => patch(engine.id, next),
						onDelete: () => onChange(engines.filter((item) => item.id !== engine.id)),
						onDuplicate: () => {
							const copy = {
								...structuredClone(engine),
								id: uid("eng"),
								name: uniqueName(`${engine.name}Copy`, engines),
								enabled: false
							};
							onChange([...engines, copy]);
							setOpenId(copy.id);
						},
						onReset: () => onReset(engine.id),
						onRename: (from, to) => onChange(rewriteRefs(engines, from, to))
					}, engine.id)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "btn btn-ghost w-full",
						onClick: onResetAll,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
							className: "size-4",
							"aria-hidden": true
						}), "Reset engine state"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost w-full",
						onClick: () => {
							onChange(structuredClone(STARTER_ENGINES));
							setOpenId("eng_clock");
						},
						children: "Restore examples"
					})
				]
			})
		]
	});
}
function EngineCard({ engine, engines, open, ruleMode, onToggle, onChange, onDelete, onDuplicate, onReset, onRename }) {
	const issues = engineIssues(engine, engines);
	const committed = (0, import_react.useRef)(engine.name);
	(0, import_react.useEffect)(() => {
		committed.current = engine.name;
	}, [engine.id]);
	const update = (partial) => onChange({
		...engine,
		...partial
	});
	const readers = engines.filter((item) => item.reads.includes(engine.id)).map((item) => item.name);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-bg p-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "switch",
					"aria-checked": engine.enabled,
					"aria-label": engine.enabled ? `Pause ${engine.name}` : `Run ${engine.name}`,
					className: "flex h-11 w-12 items-center justify-center",
					onClick: () => update({ enabled: !engine.enabled }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-6 w-11 items-center rounded-full border border-line bg-surface-2 p-0.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: engine.enabled ? "size-5 translate-x-5 rounded-full bg-accent transition-transform" : "size-5 translate-x-0 rounded-full bg-subtle transition-transform" })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "flex min-w-0 flex-1 items-center gap-2 text-left",
					onClick: onToggle,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate font-medium",
							children: engine.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate text-xs text-muted",
							children: effectLabel(engine.effect)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
						className: open ? "size-4 rotate-180 text-muted" : "size-4 text-muted",
						"aria-hidden": true
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Readout, { id: engine.id }),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 space-y-4 border-t border-line px-1 pt-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "block space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-muted",
								children: "Name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: "field",
								value: engine.name,
								"aria-label": "Engine name",
								onChange: (e) => update({ name: e.target.value }),
								onBlur: () => {
									const next = engine.name.trim();
									if (next !== engine.name) update({ name: next });
									const from = committed.current;
									if (isIdent(from) && isIdent(next) && from !== next) {
										onRename(from, next);
										committed.current = next;
									}
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: msg(issues, "name") })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Variables",
						hint: "Remembered numbers. The update sees the previous value. Leave update blank to keep a constant.",
						onAdd: () => update({ variables: [...engine.variables, {
							id: uid("var"),
							name: fresh("v", taken(engine)),
							initial: "0",
							update: ""
						}] }),
						addLabel: "Add variable",
						children: engine.variables.map((variable) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VarRow, {
							variable,
							error: msg(issues, variable.id),
							initialError: msg(issues, `${variable.id}:initial`),
							updateError: msg(issues, `${variable.id}:update`),
							onChange: (next) => update({ variables: engine.variables.map((item) => item.id === variable.id ? next : item) }),
							onRemove: () => update({ variables: engine.variables.filter((item) => item.id !== variable.id) })
						}, variable.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Values",
						hint: "Fresh results each generation. Other engines read them as Name.value.",
						onAdd: () => update({ values: [...engine.values, {
							id: uid("val"),
							name: fresh("out", taken(engine)),
							expr: "0"
						}] }),
						addLabel: "Add value",
						children: engine.values.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExprRow, {
							name: value.name,
							expr: value.expr,
							nameLabel: "Value name",
							exprLabel: "Value expression",
							error: msg(issues, value.id),
							onName: (name) => update({ values: replaceName(engine.values, value.id, name) }),
							onExpr: (expr) => update({ values: engine.values.map((item) => item.id === value.id ? {
								...item,
								expr
							} : item) }),
							onRemove: () => update({ values: engine.values.filter((item) => item.id !== value.id) })
						}, value.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Functions",
						hint: "Reusable formulas. Use x and y for a field across the grid.",
						onAdd: () => update({ functions: [...engine.functions, {
							id: uid("fn"),
							name: fresh("field", taken(engine)),
							params: "x, y",
							expr: "sin(x * 0.2) * sin(y * 0.2)"
						}] }),
						addLabel: "Add function",
						children: engine.functions.map((fn) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FnRow, {
							fn,
							error: msg(issues, fn.id),
							paramError: msg(issues, `${fn.id}:params`),
							onChange: (next) => update({ functions: engine.functions.map((item) => item.id === fn.id ? next : item) }),
							onRemove: () => update({ functions: engine.functions.filter((item) => item.id !== fn.id) })
						}, fn.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Arrays",
						hint: "Fixed lists, separated by commas. Index them with seq[0], or pass one to sum().",
						onAdd: () => update({ arrays: [...engine.arrays, {
							id: uid("arr"),
							name: fresh("seq", taken(engine)),
							values: "0, 1, 2"
						}] }),
						addLabel: "Add array",
						children: engine.arrays.map((arr) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrayRow, {
							arr,
							error: msg(issues, arr.id),
							onChange: (next) => update({ arrays: engine.arrays.map((item) => item.id === arr.id ? next : item) }),
							onRemove: () => update({ arrays: engine.arrays.filter((item) => item.id !== arr.id) })
						}, arr.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xs font-medium text-muted",
								children: "Connections"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [engines.filter((item) => item.id !== engine.id).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-subtle",
									children: "Create another engine to read from it."
								}) : null, engines.filter((item) => item.id !== engine.id).map((item) => {
									const on = engine.reads.includes(item.id);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "chip",
										"data-on": on ? "true" : "false",
										"aria-pressed": on,
										onClick: () => update({ reads: on ? engine.reads.filter((id) => id !== item.id) : [...engine.reads, item.id] }),
										children: item.name
									}, item.id);
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: readers.length ? `Read by ${readers.join(", ")}` : "Not read by other engines yet."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EffectEditor, {
						engine,
						issues,
						ruleMode,
						onChange: (effect) => update({ effect })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn btn-ghost",
								onClick: onReset,
								children: "Reset state"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn btn-ghost",
								onClick: onDuplicate,
								children: "Duplicate"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "btn btn-ghost text-danger",
								onClick: onDelete,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
									className: "size-4",
									"aria-hidden": true
								}), "Delete"]
							})
						]
					})
				]
			}) : null
		]
	});
}
function Readout({ id }) {
	const readout = useHud((s) => s.readouts[id]);
	if (!readout) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "px-2 pt-1",
		children: [
			readout.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-danger",
				children: readout.error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted tabular-nums",
				children: [readout.numbers.slice(0, 4).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					item.name,
					" ",
					fmt(item.value)
				] }, item.name)), readout.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "paused" }) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spark, { values: readout.history })
		]
	});
}
function Spark({ values }) {
	if (values.length < 2) return null;
	const min = Math.min(...values);
	const span = Math.max(...values) - min || 1;
	const shown = values.slice(-36);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 flex h-8 items-end gap-px",
		"aria-hidden": true,
		children: shown.map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "min-w-px flex-1 bg-fg/70",
			style: { height: `${12 + (value - min) / span * 88}%` }
		}, `${index}-${shown.length}`))
	});
}
function Section({ title, hint, onAdd, addLabel, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-medium text-muted",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "btn btn-ghost px-3 text-xs",
					onClick: onAdd,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
						className: "size-3.5",
						"aria-hidden": true
					}), addLabel]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-normal text-subtle",
				children: hint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children
			})
		]
	});
}
function VarRow({ variable, error, initialError, updateError, onChange, onRemove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "row-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						"aria-label": "Variable name",
						value: variable.name,
						onChange: (e) => onChange({
							...variable,
							name: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						"aria-label": "Initial value",
						value: variable.initial,
						onChange: (e) => onChange({
							...variable,
							initial: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Remove, {
						onClick: onRemove,
						label: `Remove variable ${variable.name}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field",
				"aria-label": "Update expression",
				placeholder: "Update expression",
				value: variable.update,
				onChange: (e) => onChange({
					...variable,
					update: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: error || initialError || updateError })
		]
	});
}
function ExprRow({ name, expr, nameLabel, exprLabel, error, onName, onExpr, onRemove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "row-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					"aria-label": nameLabel,
					value: name,
					onChange: (e) => onName(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					"aria-label": exprLabel,
					value: expr,
					onChange: (e) => onExpr(e.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Remove, {
					onClick: onRemove,
					label: `Remove ${name}`
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: error })]
	});
}
function FnRow({ fn, error, paramError, onChange, onRemove }) {
	const parsed = parseParams(fn.params);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "row-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						"aria-label": "Function name",
						value: fn.name,
						onChange: (e) => onChange({
							...fn,
							name: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "field",
						"aria-label": "Parameters",
						value: fn.params,
						onChange: (e) => onChange({
							...fn,
							params: e.target.value
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Remove, {
						onClick: onRemove,
						label: `Remove function ${fn.name}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field",
				"aria-label": "Function expression",
				value: fn.expr,
				onChange: (e) => onChange({
					...fn,
					expr: e.target.value
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: parsed.params.length ? `Call as ${fn.name}(${parsed.params.join(", ")})` : "No parameters"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: paramError || error })
		]
	});
}
function ArrayRow({ arr, error, onChange, onRemove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "row-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					"aria-label": "Array name",
					value: arr.name,
					onChange: (e) => onChange({
						...arr,
						name: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: "field",
					"aria-label": "Array values",
					value: arr.values,
					onChange: (e) => onChange({
						...arr,
						values: e.target.value
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Remove, {
					onClick: onRemove,
					label: `Remove array ${arr.name}`
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: error })]
	});
}
function EffectEditor({ engine, issues, ruleMode, onChange }) {
	const effect = engine.effect;
	const numeric = names([...engine.variables.map((item) => item.name), ...engine.values.map((item) => item.name)]);
	const fns = names(engine.functions.map((item) => item.name));
	const arrays = names(engine.arrays.map((item) => item.name));
	const setType = (type) => {
		if (type === "none") onChange({ type: "none" });
		else if (type === "tint" || type === "nudge") onChange({
			type,
			source: fns[0] ?? ""
		});
		else if (type === "rule") onChange({
			type: "rule",
			birth: arrays[0] ?? "",
			survive: arrays[1] ?? arrays[0] ?? ""
		});
		else if (type === "inject") onChange({
			type: "inject",
			source: numeric[0] ?? "",
			pattern: "glider"
		});
		else onChange({
			type,
			source: numeric[0] ?? ""
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-xs font-medium text-muted",
				children: "Effect"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "field",
				"aria-label": "Effect",
				value: effect.type,
				onChange: (e) => setType(e.target.value),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "none",
						children: "Data only"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "speed",
						children: "Drive speed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "tint",
						children: "Tint the field"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "nudge",
						children: "Nudge cells"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "inject",
						children: "Inject a pattern"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "seed",
						children: "Seed cells"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "rule",
						children: "Replace the rule"
					})
				]
			}),
			effect.type === "speed" || effect.type === "seed" || effect.type === "inject" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "field",
				"aria-label": "Source value",
				value: effect.source,
				onChange: (e) => onChange({
					...effect,
					source: e.target.value
				}),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Choose a value"
				}), numeric.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: name,
					children: name
				}, name))]
			}) : null,
			effect.type === "tint" || effect.type === "nudge" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: "field",
				"aria-label": "Source function",
				value: effect.source,
				onChange: (e) => onChange({
					...effect,
					source: e.target.value
				}),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Choose a function"
				}), fns.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: name,
					children: name
				}, name))]
			}) : null,
			effect.type === "inject" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				className: "field",
				"aria-label": "Pattern to inject",
				value: effect.pattern,
				onChange: (e) => onChange({
					...effect,
					pattern: e.target.value
				}),
				children: PATTERNS.filter((pattern) => [
					"glider",
					"blinker",
					"lwss",
					"block"
				].includes(pattern.id)).map((pattern) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: pattern.id,
					children: pattern.name
				}, pattern.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: "Fires on the rising edge. Uses values named px and py when you define them."
			})] }) : null,
			effect.type === "seed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: "The value is how many new cells to add each generation."
			}) : null,
			effect.type === "nudge" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: "Cells turn on above 0.72 and off below -0.72. Anything between is left alone."
			}) : null,
			effect.type === "rule" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "field",
					"aria-label": "Birth array",
					value: effect.birth,
					onChange: (e) => onChange({
						...effect,
						birth: e.target.value
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Birth counts"
					}), arrays.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: name,
						children: name
					}, name))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: "field",
					"aria-label": "Survive array",
					value: effect.survive,
					onChange: (e) => onChange({
						...effect,
						survive: e.target.value
					}),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Survive counts"
					}), arrays.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: name,
						children: name
					}, name))]
				}),
				ruleMode === "manual" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-subtle",
					children: "Switch rule source to Engines before this replaces Life."
				}) : null
			] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldError, { message: msg(issues, "effect") })
		]
	});
}
function Remove({ onClick, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "btn btn-ghost w-11 px-0",
		"aria-label": label,
		onClick,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
			className: "size-4",
			"aria-hidden": true
		})
	});
}
function FieldError({ message }) {
	if (!message) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-xs text-danger",
		children: message
	});
}
function msg(issues, field) {
	return issues.find((issue) => issue.field === field)?.message ?? null;
}
function names(list) {
	return list.filter((name) => isIdent(name));
}
function taken(engine) {
	return new Set([
		...engine.variables,
		...engine.values,
		...engine.functions,
		...engine.arrays
	].map((item) => item.name));
}
function fresh(base, used) {
	if (!used.has(base)) return base;
	let n = 2;
	while (used.has(`${base}${n}`)) n += 1;
	return `${base}${n}`;
}
function replaceName(list, id, name) {
	return list.map((item) => item.id === id ? {
		...item,
		name
	} : item);
}
function uniqueName(base, engines) {
	const used = new Set(engines.map((engine) => engine.name));
	if (!used.has(base)) return base;
	let n = 2;
	while (used.has(`${base}${n}`)) n += 1;
	return `${base}${n}`;
}
function fmt(n) {
	if (!Number.isFinite(n)) return "—";
	const abs = Math.abs(n);
	if (abs !== 0 && (abs < .001 || abs >= 1e4)) return n.toExponential(2);
	return String(Math.round(n * 1e3) / 1e3);
}
function hasCycle(engines) {
	const byId = new Map(engines.map((engine) => [engine.id, engine]));
	const visiting = /* @__PURE__ */ new Set();
	const visited = /* @__PURE__ */ new Set();
	const walk = (id) => {
		if (visited.has(id)) return false;
		if (visiting.has(id)) return true;
		visiting.add(id);
		for (const read of byId.get(id)?.reads ?? []) if (byId.has(read) && walk(read)) return true;
		visiting.delete(id);
		visited.add(id);
		return false;
	};
	return engines.some((engine) => walk(engine.id));
}
var ZOOMS = [
	1,
	2,
	3,
	4,
	6,
	8,
	10,
	12,
	16,
	20,
	28,
	40,
	56
];
var BG = "#0c0d0c";
var FIELD = "#b7c9be";
var SHADE = "#070908";
var HAIR = "#d7e3db";
var LIVE = [
	"#8ea79c",
	"#a9bdb3",
	"#c5d4cb",
	"#e3ece7",
	"#f4f7f5"
];
var LifeStage = (0, import_react.forwardRef)(function LifeStage({ sim, runningRef, spaceRef, tool, brush, showGrid, fitToken }, ref) {
	const canvasRef = (0, import_react.useRef)(null);
	const coordRef = (0, import_react.useRef)(null);
	const zoomRef = (0, import_react.useRef)(null);
	const camRef = (0, import_react.useRef)({
		cell: 8,
		panX: 0,
		panY: 0,
		dpr: 1
	});
	const toolRef = (0, import_react.useRef)(tool);
	const brushRef = (0, import_react.useRef)(brush);
	const gridRef = (0, import_react.useRef)(showGrid);
	const drawRef = (0, import_react.useRef)(() => {});
	toolRef.current = tool;
	brushRef.current = brush;
	gridRef.current = showGrid;
	const frameGrid = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		const viewW = Math.max(1, Math.round(rect.width * dpr));
		const viewH = Math.max(1, Math.round(rect.height * dpr));
		const cam = camRef.current;
		cam.dpr = dpr;
		const choices = [
			10,
			12,
			8,
			14,
			6,
			4,
			3,
			2
		];
		let cell = 4;
		for (const z of choices) if (viewW / z >= 22 && viewH / z >= 14) {
			cell = z;
			break;
		}
		cam.cell = cell;
		cam.panX = Math.round((viewW - sim.cols * cell) / 2);
		cam.panY = Math.round((viewH - sim.rows * cell) / 2);
		syncZoom();
	};
	const fit = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 3);
		const viewW = Math.max(1, Math.round(rect.width * dpr));
		const viewH = Math.max(1, Math.round(rect.height * dpr));
		const cam = camRef.current;
		cam.dpr = dpr;
		let cell = ZOOMS[0];
		for (const z of ZOOMS) if (z * sim.cols <= viewW - 12 && z * sim.rows <= viewH - 12) cell = z;
		cam.cell = cell;
		cam.panX = Math.round((viewW - sim.cols * cell) / 2);
		cam.panY = Math.round((viewH - sim.rows * cell) / 2);
		syncZoom();
	};
	const syncZoom = () => {
		const cam = camRef.current;
		const css = cam.cell / (cam.dpr || 1);
		if (zoomRef.current) zoomRef.current.textContent = `${Number.isInteger(css) ? css.toFixed(0) : css.toFixed(1)} px`;
	};
	(0, import_react.useImperativeHandle)(ref, () => ({
		zoom: (dir) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			zoomAt(camRef.current, canvas.width / 2, canvas.height / 2, dir);
			clampPan(camRef.current, canvas.width, canvas.height, sim.cols, sim.rows);
			syncZoom();
			drawRef.current();
		},
		fit: () => {
			fit();
			drawRef.current();
		}
	}));
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const cam = camRef.current;
		let raf = 0;
		let last = performance.now();
		let acc = 0;
		let hover = null;
		let painting = false;
		let panning = false;
		let erase = false;
		let lastCol = -1;
		let lastRow = -1;
		let undoArmed = false;
		let panOrigin = {
			x: 0,
			y: 0,
			panX: 0,
			panY: 0
		};
		let wheelAcc = 0;
		const pointers = /* @__PURE__ */ new Map();
		let pinch = null;
		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 3);
			if (cam.dpr && Math.abs(dpr - cam.dpr) > .01) {
				const k = dpr / cam.dpr;
				cam.cell = Math.max(1, Math.round(cam.cell * k));
				cam.panX = Math.round(cam.panX * k);
				cam.panY = Math.round(cam.panY * k);
			}
			cam.dpr = dpr;
			const bw = Math.max(1, Math.round(rect.width * dpr));
			const bh = Math.max(1, Math.round(rect.height * dpr));
			if (canvas.width !== bw || canvas.height !== bh) {
				canvas.width = bw;
				canvas.height = bh;
			}
			return {
				bw,
				bh
			};
		};
		const draw = () => {
			const { bw, bh } = resize();
			ctx.imageSmoothingEnabled = false;
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.fillStyle = BG;
			ctx.fillRect(0, 0, bw, bh);
			const cell = Math.max(1, cam.cell);
			const { panX, panY } = cam;
			const cols = sim.cols;
			const rows = sim.rows;
			const c0 = Math.max(0, Math.floor(-panX / cell) - 1);
			const r0 = Math.max(0, Math.floor(-panY / cell) - 1);
			const c1 = Math.min(cols, Math.ceil((bw - panX) / cell) + 1);
			const r1 = Math.min(rows, Math.ceil((bh - panY) / cell) + 1);
			const gap = gridRef.current && cell >= 6 ? 1 : 0;
			if (sim.fieldActive) {
				const sx = cols / 48;
				const sy = rows / 30;
				for (let fy = 0; fy < 30; fy += 1) {
					const y = panY + fy * sy * cell;
					const h = Math.max(1, Math.ceil(sy * cell));
					if (y + h < 0 || y > bh) continue;
					for (let fx = 0; fx < 48; fx += 1) {
						const v = sim.field[fy * 48 + fx] ?? 0;
						if (v < .08 && v > -.08) continue;
						const x = panX + fx * sx * cell;
						const w = Math.max(1, Math.ceil(sx * cell));
						if (x + w < 0 || x > bw) continue;
						if (v > 0) {
							ctx.globalAlpha = Math.min(.22, v * .16);
							ctx.fillStyle = FIELD;
						} else {
							ctx.globalAlpha = Math.min(.4, -v * .22);
							ctx.fillStyle = SHADE;
						}
						ctx.fillRect(x, y, w, h);
					}
				}
				ctx.globalAlpha = 1;
			}
			let bucket = -1;
			const cells = sim.cells;
			for (let r = r0; r < r1; r += 1) {
				const row = r * cols;
				const y = panY + r * cell;
				for (let c = c0; c < c1; c += 1) {
					if (!cells[row + c]) continue;
					let b = 4;
					if (sim.fieldActive) {
						const v = sim.sampleFieldAt(c, r);
						b = v < -.6 ? 0 : v < -.25 ? 1 : v < .2 ? 2 : v < .55 ? 3 : 4;
					}
					if (b !== bucket) {
						ctx.fillStyle = LIVE[b] ?? LIVE[4];
						bucket = b;
					}
					ctx.fillRect(panX + c * cell, y, Math.max(1, cell - gap), Math.max(1, cell - gap));
				}
			}
			if (hover && hover.col >= 0 && hover.row >= 0 && hover.col < cols && hover.row < rows && toolRef.current !== "pan") {
				const radius = Math.max(0, brushRef.current - 1 >> 1);
				const x = panX + (hover.col - radius) * cell;
				const y = panY + (hover.row - radius) * cell;
				const size = (radius * 2 + 1) * cell;
				ctx.strokeStyle = HAIR;
				ctx.lineWidth = 1;
				ctx.strokeRect(x + .5, y + .5, Math.max(1, size - 1), Math.max(1, size - 1));
			}
		};
		drawRef.current = draw;
		const frame = (now) => {
			const dt = Math.min(.1, (now - last) / 1e3);
			last = now;
			if (runningRef.current) {
				acc += dt;
				const stepDt = 1 / Math.max(1, sim.speed);
				let guard = 0;
				while (acc >= stepDt && guard < 5) {
					sim.step();
					acc -= stepDt;
					guard += 1;
				}
				if (guard >= 5) acc = 0;
			} else acc = 0;
			draw();
			raf = requestAnimationFrame(frame);
		};
		const worldOf = (clientX, clientY) => {
			const rect = canvas.getBoundingClientRect();
			const x = (clientX - rect.left) / Math.max(1, rect.width) * canvas.width;
			const y = (clientY - rect.top) / Math.max(1, rect.height) * canvas.height;
			return {
				x,
				y,
				col: Math.floor((x - cam.panX) / cam.cell),
				row: Math.floor((y - cam.panY) / cam.cell)
			};
		};
		const showCoord = (col, row) => {
			if (!coordRef.current) return;
			if (col < 0 || row < 0 || col >= sim.cols || row >= sim.rows) coordRef.current.textContent = "—";
			else coordRef.current.textContent = `${col}, ${row}`;
		};
		const beginPan = (x, y) => {
			panning = true;
			painting = false;
			panOrigin = {
				x,
				y,
				panX: cam.panX,
				panY: cam.panY
			};
		};
		const onDown = (e) => {
			canvas.setPointerCapture(e.pointerId);
			const p = worldOf(e.clientX, e.clientY);
			pointers.set(e.pointerId, {
				x: p.x,
				y: p.y
			});
			if (pointers.size >= 2) {
				const pts = [...pointers.values()];
				const a = pts[0];
				const b = pts[1];
				if (!a || !b) return;
				pinch = {
					dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
					midX: (a.x + b.x) / 2,
					midY: (a.y + b.y) / 2,
					panX: cam.panX,
					panY: cam.panY,
					cell: cam.cell
				};
				painting = false;
				panning = false;
				return;
			}
			if (e.button === 1 || toolRef.current === "pan" || spaceRef.current.down) {
				beginPan(p.x, p.y);
				return;
			}
			painting = true;
			erase = e.button === 2 || toolRef.current === "erase";
			if (!undoArmed) {
				sim.pushUndo();
				undoArmed = true;
			}
			lastCol = p.col;
			lastRow = p.row;
			sim.paintDot(p.col, p.row, !erase, brushRef.current);
			draw();
		};
		const onMove = (e) => {
			const p = worldOf(e.clientX, e.clientY);
			if (pointers.has(e.pointerId)) pointers.set(e.pointerId, {
				x: p.x,
				y: p.y
			});
			hover = {
				col: p.col,
				row: p.row
			};
			showCoord(p.col, p.row);
			if (pinch && pointers.size >= 2) {
				const pts = [...pointers.values()];
				const a = pts[0];
				const b = pts[1];
				if (!a || !b) return;
				const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
				const midX = (a.x + b.x) / 2;
				const midY = (a.y + b.y) / 2;
				const ratio = dist / pinch.dist;
				const wanted = pinch.cell * ratio;
				let next = ZOOMS[0];
				for (const z of ZOOMS) if (Math.abs(z - wanted) < Math.abs(next - wanted)) next = z;
				const wx = (pinch.midX - pinch.panX) / pinch.cell;
				const wy = (pinch.midY - pinch.panY) / pinch.cell;
				cam.cell = next;
				cam.panX = Math.round(midX - wx * next + (midX - pinch.midX));
				cam.panY = Math.round(midY - wy * next + (midY - pinch.midY));
				clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
				syncZoom();
				spaceRef.current.dragged = true;
				return;
			}
			if (panning || spaceRef.current.down && e.buttons) {
				if (!panning) beginPan(p.x, p.y);
				cam.panX = Math.round(panOrigin.panX + (p.x - panOrigin.x));
				cam.panY = Math.round(panOrigin.panY + (p.y - panOrigin.y));
				clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
				spaceRef.current.dragged = true;
				return;
			}
			if (!painting) return;
			const list = e.getCoalescedEvents?.() ?? [e];
			for (const ev of list) {
				const q = worldOf(ev.clientX, ev.clientY);
				if (lastCol >= 0) sim.paintAt(lastCol, lastRow, q.col, q.row, !erase, brushRef.current);
				else sim.paintDot(q.col, q.row, !erase, brushRef.current);
				lastCol = q.col;
				lastRow = q.row;
			}
		};
		const endPointer = (e) => {
			pointers.delete(e.pointerId);
			if (pointers.size < 2) pinch = null;
			if (pointers.size === 0) {
				const was = painting;
				painting = false;
				panning = false;
				undoArmed = false;
				lastCol = -1;
				lastRow = -1;
				if (was) sim.publish(true);
			}
		};
		const onLeave = () => {
			hover = null;
			if (coordRef.current) coordRef.current.textContent = "—";
		};
		const onWheel = (e) => {
			e.preventDefault();
			const p = worldOf(e.clientX, e.clientY);
			if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > .5) {
				cam.panX -= e.deltaX;
				cam.panY -= e.deltaY;
				clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
				return;
			}
			wheelAcc += e.deltaY;
			const steps = wheelAcc > 0 ? Math.floor(wheelAcc / 70) : Math.ceil(wheelAcc / 70);
			if (steps === 0) return;
			wheelAcc -= steps * 70;
			const dir = steps > 0 ? -1 : 1;
			for (let i = 0; i < Math.min(4, Math.abs(steps)); i += 1) zoomAt(cam, p.x, p.y, dir);
			clampPan(cam, canvas.width, canvas.height, sim.cols, sim.rows);
			syncZoom();
		};
		const onMenu = (e) => e.preventDefault();
		canvas.addEventListener("pointerdown", onDown);
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerup", endPointer);
		canvas.addEventListener("pointercancel", endPointer);
		canvas.addEventListener("pointerleave", onLeave);
		canvas.addEventListener("wheel", onWheel, { passive: false });
		canvas.addEventListener("contextmenu", onMenu);
		const boot = () => {
			const rect = canvas.getBoundingClientRect();
			if (rect.width < 8 || rect.height < 8) {
				raf = requestAnimationFrame(boot);
				return;
			}
			frameGrid();
			last = performance.now();
			raf = requestAnimationFrame(frame);
		};
		boot();
		return () => {
			cancelAnimationFrame(raf);
			canvas.removeEventListener("pointerdown", onDown);
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerup", endPointer);
			canvas.removeEventListener("pointercancel", endPointer);
			canvas.removeEventListener("pointerleave", onLeave);
			canvas.removeEventListener("wheel", onWheel);
			canvas.removeEventListener("contextmenu", onMenu);
		};
	}, [sim]);
	const framed = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (!framed.current) {
			framed.current = true;
			return;
		}
		const canvas = canvasRef.current;
		if (!canvas || canvas.getBoundingClientRect().width < 8) return;
		frameGrid();
		drawRef.current();
	}, [fitToken]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-0 flex-1 bg-bg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			className: `h-full w-full touch-none ${tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`,
			"aria-label": "Conway grid. Drag to paint living cells."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 font-mono text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				ref: coordRef,
				children: "—"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				ref: zoomRef,
				children: "—"
			})]
		})]
	});
});
function zoomAt(cam, x, y, dir) {
	let index = ZOOMS.indexOf(cam.cell);
	if (index < 0) {
		index = 0;
		for (let i = 0; i < ZOOMS.length; i += 1) if ((ZOOMS[i] ?? 1) <= cam.cell) index = i;
	}
	const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, index + dir))];
	if (!next || next === cam.cell) return;
	const wx = (x - cam.panX) / cam.cell;
	const wy = (y - cam.panY) / cam.cell;
	cam.cell = next;
	cam.panX = Math.round(x - wx * next);
	cam.panY = Math.round(y - wy * next);
}
function clampPan(cam, viewW, viewH, cols, rows) {
	const worldW = cols * cam.cell;
	const worldH = rows * cam.cell;
	const margin = cam.cell * 2;
	if (worldW <= viewW) cam.panX = Math.round((viewW - worldW) / 2);
	else cam.panX = Math.round(Math.min(viewW - margin, Math.max(margin - worldW, cam.panX)));
	if (worldH <= viewH) cam.panY = Math.round((viewH - worldH) / 2);
	else cam.panY = Math.round(Math.min(viewH - margin, Math.max(margin - worldH, cam.panY)));
}
var KEY = "life-lab-v1";
var GRIDS = [
	{
		label: "100×64",
		cols: 100,
		rows: 64
	},
	{
		label: "160×100",
		cols: 160,
		rows: 100
	},
	{
		label: "220×140",
		cols: 220,
		rows: 140
	}
];
var DEFAULTS = {
	wrap: true,
	showGrid: true,
	baseSpeed: 12,
	ruleMode: "manual",
	ruleText: "B3/S23",
	cols: 160,
	rows: 100,
	density: .28,
	tool: "paint",
	brush: 1,
	keepBoard: false
};
function LifeApp() {
	const simRef = (0, import_react.useRef)(null);
	if (simRef.current === null) simRef.current = new Simulation();
	const sim = simRef.current;
	const [engines, setEngines] = (0, import_react.useState)(() => structuredClone(STARTER_ENGINES));
	const [settings, setSettings] = (0, import_react.useState)(DEFAULTS);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [booted, setBooted] = (0, import_react.useState)(false);
	const [mobileOpen, setMobileOpen] = (0, import_react.useState)(false);
	const [fitToken, setFitToken] = (0, import_react.useState)(0);
	const runningRef = (0, import_react.useRef)(false);
	const spaceRef = (0, import_react.useRef)({
		down: false,
		dragged: false
	});
	const stageRef = (0, import_react.useRef)(null);
	runningRef.current = running;
	(0, import_react.useEffect)(() => {
		const saved = loadSave();
		const nextEngines = saved?.engines ?? structuredClone(STARTER_ENGINES);
		const nextSettings = saved?.settings ?? DEFAULTS;
		if (nextSettings.cols !== sim.cols || nextSettings.rows !== sim.rows) sim.resize(nextSettings.cols, nextSettings.rows);
		applySettings(sim, nextSettings);
		sim.setDefs(nextEngines);
		const gun = patternById("gosper");
		if (gun) sim.stamp(gun, true);
		setEngines(nextEngines);
		setSettings(nextSettings);
		if (nextSettings.cols !== 160 || nextSettings.rows !== 100) setFitToken((token) => token + 1);
		setBooted(true);
		setRunning(true);
		window.__life = sim;
	}, [sim]);
	(0, import_react.useEffect)(() => {
		if (!booted) return;
		applySettings(sim, settings);
	}, [
		booted,
		settings,
		sim
	]);
	(0, import_react.useEffect)(() => {
		if (!booted) return;
		sim.setDefs(engines);
	}, [
		booted,
		engines,
		sim
	]);
	(0, import_react.useEffect)(() => {
		if (!booted) return;
		const id = window.setTimeout(() => {
			localStorage.setItem(KEY, JSON.stringify({
				version: 1,
				engines,
				settings
			}));
		}, 250);
		return () => window.clearTimeout(id);
	}, [
		booted,
		engines,
		settings
	]);
	(0, import_react.useEffect)(() => {
		const typing = (target) => {
			return !!target?.closest?.("input, textarea, select, button, a");
		};
		const onDown = (event) => {
			if (typing(event.target)) return;
			if (event.code === "Space") {
				event.preventDefault();
				if (event.repeat) return;
				spaceRef.current.down = true;
				spaceRef.current.dragged = false;
				return;
			}
			if (event.code === "ArrowRight" || event.code === "Period") {
				event.preventDefault();
				sim.step();
				return;
			}
			if (event.key === "[") setSettings((s) => ({
				...s,
				baseSpeed: Math.max(1, s.baseSpeed - 1)
			}));
			if (event.key === "]") setSettings((s) => ({
				...s,
				baseSpeed: Math.min(40, s.baseSpeed + 1)
			}));
			if (event.key === "-" || event.key === "_") stageRef.current?.zoom(-1);
			if (event.key === "=" || event.key === "+") stageRef.current?.zoom(1);
			if (event.key === "0") stageRef.current?.fit();
			if ((event.key === "z" || event.key === "Z") && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				sim.undo();
			}
			if (event.key === "g" || event.key === "G") setSettings((s) => ({
				...s,
				showGrid: !s.showGrid
			}));
			if (event.key === "w" || event.key === "W") setSettings((s) => ({
				...s,
				wrap: !s.wrap
			}));
			if (event.key === "1") setSettings((s) => ({
				...s,
				tool: "paint"
			}));
			if (event.key === "2") setSettings((s) => ({
				...s,
				tool: "erase"
			}));
			if (event.key === "3") setSettings((s) => ({
				...s,
				tool: "pan"
			}));
		};
		const onUp = (event) => {
			if (event.code !== "Space") return;
			if (typing(event.target)) return;
			const dragged = spaceRef.current.dragged;
			spaceRef.current.down = false;
			spaceRef.current.dragged = false;
			if (!dragged) setRunning((value) => !value);
		};
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
		};
	}, [sim]);
	const place = (id) => {
		const pattern = patternById(id);
		if (!pattern) return;
		sim.stamp(pattern, !settings.keepBoard);
	};
	const setRule = (text) => {
		const rule = parseRule(text);
		if (!rule) return;
		setSettings((s) => ({
			...s,
			ruleText: formatRule(rule),
			ruleMode: "manual"
		}));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex h-14 shrink-0 items-center gap-3 overflow-hidden border-b border-line px-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: "Conway"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-lg font-medium tracking-tight",
					children: "Life Lab"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Status, {})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-h-0 flex-1 flex-col lg:flex-row",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 min-w-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 border-b border-line px-3 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "btn btn-primary",
									onClick: () => setRunning((value) => !value),
									"aria-pressed": running,
									children: [running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
										className: "size-4",
										"aria-hidden": true
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
										className: "size-4",
										"aria-hidden": true
									}), running ? "Pause" : "Play"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "btn btn-ghost",
									onClick: () => sim.step(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, {
										className: "size-4",
										"aria-hidden": true
									}), "Step"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpeedControl, {
									base: settings.baseSpeed,
									onChange: (baseSpeed) => setSettings((s) => ({
										...s,
										baseSpeed
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-ghost w-11 px-0",
									"aria-label": "Zoom out",
									onClick: () => stageRef.current?.zoom(-1),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, {
										className: "size-4",
										"aria-hidden": true
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-ghost",
									onClick: () => stageRef.current?.fit(),
									children: "Fit"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "btn btn-ghost w-11 px-0",
									"aria-label": "Zoom in",
									onClick: () => stageRef.current?.zoom(1),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
										className: "size-4",
										"aria-hidden": true
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "scroll-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolButton, {
									on: settings.tool === "paint",
									label: "Paint",
									onClick: () => setSettings((s) => ({
										...s,
										tool: "paint"
									})),
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paintbrush, {
										className: "size-4",
										"aria-hidden": true
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolButton, {
									on: settings.tool === "erase",
									label: "Erase",
									onClick: () => setSettings((s) => ({
										...s,
										tool: "erase"
									})),
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eraser, {
										className: "size-4",
										"aria-hidden": true
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolButton, {
									on: settings.tool === "pan",
									label: "Move",
									onClick: () => setSettings((s) => ({
										...s,
										tool: "pan"
									})),
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, {
										className: "size-4",
										"aria-hidden": true
									})
								}),
								[
									1,
									3,
									5
								].map((size) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.brush === size ? "true" : "false",
									"aria-pressed": settings.brush === size,
									onClick: () => setSettings((s) => ({
										...s,
										brush: size
									})),
									children: ["Brush ", size]
								}, size)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "chip",
									onClick: () => sim.clearBoard(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
										className: "mr-2 size-4",
										"aria-hidden": true
									}), "Clear"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "chip",
									onClick: () => sim.randomize(),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, {
											className: "mr-2 size-4",
											"aria-hidden": true
										}),
										"Random ",
										Math.round(settings.density * 100),
										"%"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted",
										children: "Density"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "range",
										min: 5,
										max: 70,
										value: Math.round(settings.density * 100),
										"aria-label": "Random density",
										onChange: (e) => setSettings((s) => ({
											...s,
											density: Number(e.target.value) / 100
										}))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "chip",
									onClick: () => sim.undo(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
										className: "mr-2 size-4",
										"aria-hidden": true
									}), "Undo"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.wrap ? "true" : "false",
									"aria-pressed": settings.wrap,
									onClick: () => setSettings((s) => ({
										...s,
										wrap: !s.wrap
									})),
									children: "Wrap"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.showGrid ? "true" : "false",
									"aria-pressed": settings.showGrid,
									onClick: () => setSettings((s) => ({
										...s,
										showGrid: !s.showGrid
									})),
									children: "Grid"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.keepBoard ? "true" : "false",
									"aria-pressed": settings.keepBoard,
									onClick: () => setSettings((s) => ({
										...s,
										keepBoard: !s.keepBoard
									})),
									children: "Stamp over"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "scroll-row",
							children: PATTERNS.map((pattern) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "chip",
								onClick: () => place(pattern.id),
								children: pattern.name
							}, pattern.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "scroll-row",
							children: [
								RULE_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.ruleMode === "manual" && settings.ruleText === preset.text ? "true" : "false",
									"aria-pressed": settings.ruleMode === "manual" && settings.ruleText === preset.text,
									onClick: () => setRule(preset.text),
									children: preset.name
								}, preset.id)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.ruleMode === "engine" ? "true" : "false",
									"aria-pressed": settings.ruleMode === "engine",
									onClick: () => setSettings((s) => ({
										...s,
										ruleMode: s.ruleMode === "engine" ? "manual" : "engine"
									})),
									children: "Rule from engines"
								}),
								GRIDS.map((grid) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "chip",
									"data-on": settings.cols === grid.cols && settings.rows === grid.rows ? "true" : "false",
									onClick: () => {
										if (settings.cols === grid.cols && settings.rows === grid.rows) return;
										sim.resize(grid.cols, grid.rows);
										setSettings((s) => ({
											...s,
											cols: grid.cols,
											rows: grid.rows
										}));
										setFitToken((token) => token + 1);
									},
									children: grid.label
								}, grid.label))
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-subtle",
							children: "Drag to paint. Right-drag erases. Scroll zooms. Space plays. Right arrow steps."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LifeStage, {
					ref: stageRef,
					sim,
					runningRef,
					spaceRef,
					tool: settings.tool,
					brush: settings.brush,
					showGrid: settings.showGrid,
					fitToken
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EngineBay, {
				engines,
				onChange: setEngines,
				onReset: (id) => sim.resetEngine(id),
				onResetAll: () => sim.resetAllEngines(),
				ruleMode: settings.ruleMode,
				mobileOpen,
				onMobileOpen: setMobileOpen
			})]
		})]
	});
}
function Status() {
	const generation = useHud((s) => s.generation);
	const population = useHud((s) => s.population);
	const rule = useHud((s) => s.rule);
	const ruleSource = useHud((s) => s.ruleSource);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "ml-auto flex items-center gap-3 font-mono text-xs tabular-nums sm:gap-4 sm:text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Generation",
				value: generation.toLocaleString("en-US")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				label: "Population",
				value: population.toLocaleString("en-US")
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
					label: "Rule",
					value: ruleSource ? `${rule} · ${ruleSource}` : rule
				})
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-right",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: value })]
	});
}
function SpeedControl({ base, onChange }) {
	const speed = useHud((s) => s.speed);
	const source = useHud((s) => s.speedSource);
	const shown = Math.round(source ? speed : base);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex min-w-44 flex-1 items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "range",
			min: 1,
			max: 40,
			step: 1,
			value: shown,
			"aria-label": "Speed",
			disabled: !!source,
			onChange: (e) => onChange(Number(e.target.value))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums",
			children: [
				shown,
				" gen/s",
				source ? ` · ${source}` : ""
			]
		})]
	});
}
function ToolButton({ on, label, onClick, icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		className: "chip",
		"data-on": on ? "true" : "false",
		"aria-pressed": on,
		onClick,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mr-2 inline-flex",
			children: icon
		}), label]
	});
}
function applySettings(sim, settings) {
	sim.wrap = settings.wrap;
	sim.baseSpeed = clamp(settings.baseSpeed, 1, 40);
	sim.ruleMode = settings.ruleMode;
	sim.density = clamp(settings.density, .05, .7);
	const rule = parseRule(settings.ruleText) ?? LIFE_RULE;
	sim.baseRule = rule;
	if (settings.ruleMode === "manual") sim.rule = rule;
	if (!sim.speedSource) sim.speed = sim.baseSpeed;
}
function clamp(n, min, max) {
	return Math.min(max, Math.max(min, n));
}
function loadSave() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (!Array.isArray(data.engines) || !data.engines.every(isEngine)) return null;
		const settings = {
			...DEFAULTS,
			...data.settings ?? {}
		};
		settings.baseSpeed = clamp(Number(settings.baseSpeed) || DEFAULTS.baseSpeed, 1, 40);
		settings.density = clamp(Number(settings.density) || DEFAULTS.density, .05, .7);
		settings.cols = clamp(Number(settings.cols) || DEFAULTS.cols, 20, 400);
		settings.rows = clamp(Number(settings.rows) || DEFAULTS.rows, 20, 300);
		settings.brush = [
			1,
			3,
			5
		].includes(settings.brush) ? settings.brush : 1;
		if (settings.tool !== "paint" && settings.tool !== "erase" && settings.tool !== "pan") settings.tool = "paint";
		if (settings.ruleMode !== "engine") settings.ruleMode = "manual";
		if (!parseRule(settings.ruleText)) settings.ruleText = DEFAULTS.ruleText;
		return {
			engines: data.engines,
			settings
		};
	} catch {
		return null;
	}
}
function isEngine(value) {
	if (!value || typeof value !== "object") return false;
	const engine = value;
	return typeof engine.id === "string" && typeof engine.name === "string" && typeof engine.enabled === "boolean" && Array.isArray(engine.reads) && Array.isArray(engine.variables) && Array.isArray(engine.values) && Array.isArray(engine.functions) && Array.isArray(engine.arrays) && !!engine.effect && typeof engine.effect === "object";
}
var SplitComponent = LifeApp;
//#endregion
export { SplitComponent as component };
