export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprError";
  }
}

export type Ast =
  | { t: "num"; v: number }
  | { t: "name"; name: string }
  | { t: "unary"; op: "-" | "!"; a: Ast }
  | { t: "bin"; op: string; a: Ast; b: Ast }
  | { t: "and"; a: Ast; b: Ast }
  | { t: "or"; a: Ast; b: Ast }
  | { t: "cond"; c: Ast; a: Ast; b: Ast }
  | { t: "call"; callee: Ast; args: Ast[] }
  | { t: "member"; obj: Ast; name: string }
  | { t: "index"; obj: Ast; i: Ast };

export type FnVal = { __fn: true; params: string[]; body: Ast; scope: Scope };
export type Namespace = { __ns: true; name: string; members: Record<string, Value> };
export type Builtin = { __bi: true; name: string };
export type Value = number | number[] | FnVal | Namespace | Builtin;

export type Scope = {
  get(name: string): Value | undefined;
};

export type Program = {
  ast: Ast;
  refs: string[];
  eval(scope: Scope): Value;
};

const GLOBALS = new Set(["t", "pop", "w", "h", "pi", "tau", "e"]);

const BUILTIN_NAMES = [
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
  "if",
] as const;

export const RESERVED = new Set<string>([...GLOBALS, ...BUILTIN_NAMES]);

export function isIdent(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function emptyScope(): Scope {
  return {
    get(name) {
      if (GLOBALS.has(name)) return globalValue(name);
      if (RESERVED.has(name)) return { __bi: true, name };
      return undefined;
    },
  };
}

function globalValue(name: string): number {
  switch (name) {
    case "pi":
      return Math.PI;
    case "tau":
      return Math.PI * 2;
    case "e":
      return Math.E;
    default:
      return 0;
  }
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  parse(): Ast {
    if (!this.s.trim()) throw new ExprError("Empty expression");
    const ast = this.parseOr();
    this.skip();
    if (this.i < this.s.length) {
      throw new ExprError(`Unexpected "${this.s[this.i]}"`);
    }
    return ast;
  }

  private parseOr(): Ast {
    let left = this.parseAnd();
    while (this.eat("||")) {
      left = { t: "or", a: left, b: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Ast {
    let left = this.parseCmp();
    while (this.eat("&&")) {
      left = { t: "and", a: left, b: this.parseCmp() };
    }
    return left;
  }

  private parseCmp(): Ast {
    const left = this.parseAdd();
    const ops = ["<=", ">=", "==", "!=", "<", ">"] as const;
    for (const op of ops) {
      if (this.eat(op)) return { t: "bin", op, a: left, b: this.parseAdd() };
    }
    return left;
  }

  private parseAdd(): Ast {
    let left = this.parseMul();
    for (;;) {
      if (this.eat("+")) left = { t: "bin", op: "+", a: left, b: this.parseMul() };
      else if (this.eat("-")) left = { t: "bin", op: "-", a: left, b: this.parseMul() };
      else break;
    }
    return left;
  }

  private parseMul(): Ast {
    let left = this.parseUnary();
    for (;;) {
      if (this.eat("*")) left = { t: "bin", op: "*", a: left, b: this.parseUnary() };
      else if (this.eat("/")) left = { t: "bin", op: "/", a: left, b: this.parseUnary() };
      else if (this.eat("%")) left = { t: "bin", op: "%", a: left, b: this.parseUnary() };
      else break;
    }
    return left;
  }

  private parseUnary(): Ast {
    this.skip();
    if (this.s.startsWith("!=", this.i)) return this.parsePow();
    if (this.eat("+")) return this.parseUnary();
    if (this.eat("-")) return { t: "unary", op: "-", a: this.parseUnary() };
    if (this.eat("!")) return { t: "unary", op: "!", a: this.parseUnary() };
    return this.parsePow();
  }

  private parsePow(): Ast {
    const left = this.parsePostfix();
    if (this.eat("^")) return { t: "bin", op: "^", a: left, b: this.parseUnary() };
    return left;
  }

  private parsePostfix(): Ast {
    let ast = this.parsePrimary();
    for (;;) {
      if (this.eat(".")) {
        const name = this.readIdent();
        if (!name) throw new ExprError("Expected a name after \".\"");
        ast = { t: "member", obj: ast, name };
        continue;
      }
      if (this.eat("(")) {
        const args: Ast[] = [];
        this.skip();
        if (!this.eat(")")) {
          for (;;) {
            args.push(this.parseOr());
            if (this.eat(")")) break;
            if (!this.eat(",")) throw new ExprError("Expected \",\" or \")\"");
          }
        }
        if (ast.t === "name" && ast.name === "if") {
          if (args.length !== 3) throw new ExprError("if(condition, a, b) needs 3 arguments");
          ast = { t: "cond", c: args[0], a: args[1], b: args[2] };
        } else {
          ast = { t: "call", callee: ast, args };
        }
        continue;
      }
      if (this.eat("[")) {
        const i = this.parseOr();
        if (!this.eat("]")) throw new ExprError("Expected \"]\"");
        ast = { t: "index", obj: ast, i };
        continue;
      }
      break;
    }
    return ast;
  }

  private parsePrimary(): Ast {
    this.skip();
    if (this.eat("(")) {
      const inner = this.parseOr();
      if (!this.eat(")")) throw new ExprError("Expected \")\"");
      return inner;
    }
    const num = this.readNumber();
    if (num !== null) return { t: "num", v: num };
    const ident = this.readIdent();
    if (ident) return { t: "name", name: ident };
    if (this.i >= this.s.length) throw new ExprError("Unexpected end of expression");
    throw new ExprError(`Unexpected "${this.s[this.i]}"`);
  }

  private readNumber(): number | null {
    this.skip();
    const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return Number(m[0]);
  }

  private readIdent(): string | null {
    this.skip();
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return m[0];
  }

  private eat(tok: string): boolean {
    this.skip();
    if (!this.s.startsWith(tok, this.i)) return false;
    const next = this.s[this.i + tok.length];
    if (/^[A-Za-z0-9_]$/.test(tok[0] ?? "") && next && /[A-Za-z0-9_]/.test(next)) return false;
    this.i += tok.length;
    return true;
  }

  private skip() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i += 1;
  }
}

export function compile(source: string): Program {
  const ast = new Parser(source).parse();
  const refs: string[] = [];
  collectRefs(ast, new Set(), refs);
  return {
    ast,
    refs,
    eval(scope) {
      return evalAst(ast, scope);
    },
  };
}

export function tryCompile(source: string): { program: Program | null; error: string | null } {
  try {
    return { program: compile(source), error: null };
  } catch (err) {
    return { program: null, error: err instanceof Error ? err.message : "Invalid expression" };
  }
}

function collectRefs(ast: Ast, params: Set<string>, out: string[]) {
  const push = (name: string) => {
    if (!params.has(name) && !out.includes(name)) out.push(name);
  };
  switch (ast.t) {
    case "num":
      return;
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

export function lintExpr(source: string, known: Set<string>, params: string[] = []): string | null {
  if (!source.trim()) return "Empty expression";
  let program: Program;
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

function evalAst(ast: Ast, scope: Scope): Value {
  switch (ast.t) {
    case "num":
      return ast.v;
    case "name": {
      const v = scope.get(ast.name);
      if (v === undefined) throw new ExprError(`Unknown name "${ast.name}"`);
      return v;
    }
    case "unary": {
      const v = asNum(evalAst(ast.a, scope), "unary");
      if (ast.op === "-") return -v;
      return truthy(v) ? 0 : 1;
    }
    case "bin":
      return evalBin(ast.op, evalAst(ast.a, scope), ast.b, scope);
    case "and": {
      const left = evalAst(ast.a, scope);
      return truthy(left) ? evalAst(ast.b, scope) : left;
    }
    case "or": {
      const left = evalAst(ast.a, scope);
      return truthy(left) ? left : evalAst(ast.b, scope);
    }
    case "cond":
      return truthy(evalAst(ast.c, scope)) ? evalAst(ast.a, scope) : evalAst(ast.b, scope);
    case "call":
      return evalCall(evalAst(ast.callee, scope), ast.args, scope);
    case "member": {
      const obj = evalAst(ast.obj, scope);
      if (!isNamespace(obj)) throw new ExprError("Cannot read a field of a non-engine");
      const member = obj.members[ast.name];
      if (member === undefined) throw new ExprError(`${obj.name} has no "${ast.name}"`);
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

function evalBin(op: string, left: Value, rightAst: Ast, scope: Scope): Value {
  if (op === "==" || op === "!=") {
    const right = evalAst(rightAst, scope);
    const same = sameValue(left, right);
    return op === "==" ? (same ? 1 : 0) : same ? 0 : 1;
  }
  const a = asNum(left, "left side");
  const b = asNum(evalAst(rightAst, scope), "right side");
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    case "%":
      return b === 0 ? NaN : a % b;
    case "^":
      return a ** b;
    case "<":
      return a < b ? 1 : 0;
    case ">":
      return a > b ? 1 : 0;
    case "<=":
      return a <= b ? 1 : 0;
    case ">=":
      return a >= b ? 1 : 0;
    default:
      throw new ExprError(`Unknown operator "${op}"`);
  }
}

function evalCall(callee: Value, argAsts: Ast[], scope: Scope): Value {
  if (isFn(callee)) {
    const locals: Record<string, Value> = {};
    callee.params.forEach((name, i) => {
      locals[name] = i < argAsts.length ? evalAst(argAsts[i], scope) : 0;
    });
    const child: Scope = {
      get(name) {
        if (name in locals) return locals[name];
        return callee.scope.get(name);
      },
    };
    return evalAst(callee.body, child);
  }
  if (isBuiltin(callee)) {
    const args = argAsts.map((a) => evalAst(a, scope));
    return callBuiltin(callee.name, args);
  }
  throw new ExprError("That value is not a function");
}

function callBuiltin(name: string, args: Value[]): Value {
  const n = (i: number) => asNum(args[i], name);
  switch (name) {
    case "sin":
      return Math.sin(n(0));
    case "cos":
      return Math.cos(n(0));
    case "tan":
      return Math.tan(n(0));
    case "asin":
      return Math.asin(clampUnit(n(0)));
    case "acos":
      return Math.acos(clampUnit(n(0)));
    case "atan":
      return Math.atan(n(0));
    case "atan2":
      return Math.atan2(n(0), n(1));
    case "abs":
      return Math.abs(n(0));
    case "floor":
      return Math.floor(n(0));
    case "ceil":
      return Math.ceil(n(0));
    case "round":
      return Math.round(n(0));
    case "sqrt":
      return Math.sqrt(Math.max(0, n(0)));
    case "pow":
      return n(0) ** n(1);
    case "log":
      return Math.log(Math.max(1e-9, n(0)));
    case "exp":
      return Math.exp(n(0));
    case "sign":
      return Math.sign(n(0));
    case "clamp":
      return Math.min(n(2), Math.max(n(1), n(0)));
    case "lerp":
      return n(0) + (n(1) - n(0)) * n(2);
    case "mod": {
      const b = n(1);
      if (b === 0) return NaN;
      return ((n(0) % b) + b) % b;
    }
    case "hypot":
      return Math.hypot(n(0), args.length > 1 ? n(1) : 0);
    case "noise":
      return valueNoise(n(0), args.length > 1 ? n(1) : 0);
    case "len":
      return asArray(args[0], name).length;
    case "sum":
      return asArray(args[0], name).reduce((s, v) => s + v, 0);
    case "avg": {
      const arr = asArray(args[0], name);
      if (!arr.length) return 0;
      return arr.reduce((s, v) => s + v, 0) / arr.length;
    }
    case "min":
      return reduceMinMax(args, "min");
    case "max":
      return reduceMinMax(args, "max");
    default:
      throw new ExprError(`Unknown function "${name}"`);
  }
}

function reduceMinMax(args: Value[], kind: "min" | "max"): number {
  let list: number[] = [];
  if (args.length === 1 && Array.isArray(args[0])) list = args[0];
  else list = args.map((a, i) => asNum(a, `${kind} arg ${i + 1}`));
  if (!list.length) return 0;
  return kind === "min" ? Math.min(...list) : Math.max(...list);
}

function valueNoise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function clampUnit(v: number): number {
  return Math.min(1, Math.max(-1, v));
}

export function asNum(v: Value | undefined, where: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new ExprError(`${where} is not a number`);
  }
  return v;
}

function asArray(v: Value | undefined, where: string): number[] {
  if (!Array.isArray(v)) throw new ExprError(`${where} expects an array`);
  return v;
}

function truthy(v: Value): boolean {
  if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function sameValue(a: Value, b: Value): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b;
  return false;
}

export function isFn(v: Value): v is FnVal {
  return typeof v === "object" && v !== null && "__fn" in v;
}

export function isNamespace(v: Value): v is Namespace {
  return typeof v === "object" && v !== null && "__ns" in v;
}

function isBuiltin(v: Value): v is Builtin {
  return typeof v === "object" && v !== null && "__bi" in v;
}

export function evaluate(ast: Ast, scope: Scope): Value {
  return evalAst(ast, scope);
}

export function evalNumber(source: string, scope: Scope = emptyScope()): number {
  const value = compile(source).eval(scope);
  return asNum(value, "value");
}
