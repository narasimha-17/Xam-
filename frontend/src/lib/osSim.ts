/**
 * A from-scratch simulator for a small subset of a Linux shell — a virtual filesystem plus
 * pwd/ls/mkdir/touch/cat/echo-redirect/cd/rm — enough to teach navigation and file basics.
 */

export interface FileNode {
  type: "file";
  content: string;
}

export interface DirNode {
  type: "dir";
  children: Record<string, FsNode>;
}

export type FsNode = FileNode | DirNode;

export interface OsState {
  root: DirNode;
  cwd: string[];
}

export interface OsCommandResult {
  state: OsState;
  output: string;
  error: boolean;
}

export function createInitialOsState(): OsState {
  const root: DirNode = {
    type: "dir",
    children: { home: { type: "dir", children: { student: { type: "dir", children: {} } } } },
  };
  return { root, cwd: ["home", "student"] };
}

function cloneNode(node: FsNode): FsNode {
  if (node.type === "file") return { ...node };
  const children: Record<string, FsNode> = {};
  for (const [k, v] of Object.entries(node.children)) children[k] = cloneNode(v);
  return { type: "dir", children };
}

function clone(state: OsState): OsState {
  return { root: cloneNode(state.root) as DirNode, cwd: [...state.cwd] };
}

function splitPath(path: string): string[] {
  return path.split("/").filter((p) => p.length > 0);
}

export function resolvePath(state: OsState, path: string): string[] {
  const isAbsolute = path.startsWith("/");
  const base = isAbsolute ? [] : [...state.cwd];
  for (const part of splitPath(path)) {
    if (part === ".") continue;
    else if (part === "..") base.pop();
    else base.push(part);
  }
  return base;
}

function getDir(root: DirNode, segments: string[]): DirNode | null {
  let cur: FsNode = root;
  for (const seg of segments) {
    if (cur.type !== "dir") return null;
    const dir: DirNode = cur;
    const next: FsNode | undefined = dir.children[seg];
    if (!next) return null;
    cur = next;
  }
  return cur.type === "dir" ? cur : null;
}

export function getNode(root: DirNode, segments: string[]): FsNode | null {
  if (segments.length === 0) return root;
  const parent = getDir(root, segments.slice(0, -1));
  if (!parent) return null;
  return parent.children[segments[segments.length - 1]] ?? null;
}

function pathString(segments: string[]): string {
  return "/" + segments.join("/");
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

const HELP_TEXT = `Supported commands:
  pwd
  ls [path]
  mkdir <name>
  touch <name>
  cat <name>
  echo <text> > <file>   (or >> to append)
  cd <path>
  rm [-r] <name>
  help`;

export function runShellCommand(state: OsState, rawInput: string): OsCommandResult {
  const input = rawInput.trim();
  if (!input) return { state, output: "", error: false };
  if (input === "help") return { state, output: HELP_TEXT, error: false };

  const tokens = tokenize(input);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  if (cmd === "pwd") {
    return { state, output: pathString(state.cwd), error: false };
  }

  if (cmd === "ls") {
    const target = args[0] ? resolvePath(state, args[0]) : state.cwd;
    const dir = getDir(state.root, target);
    if (!dir) return { state, output: `ls: cannot access '${args[0] ?? "."}': No such directory`, error: true };
    const names = Object.entries(dir.children)
      .map(([name, node]) => (node.type === "dir" ? `${name}/` : name))
      .sort();
    return { state, output: names.length ? names.join("  ") : "(empty directory)", error: false };
  }

  if (cmd === "mkdir") {
    const name = args[0];
    if (!name) return { state, output: "mkdir: missing operand", error: true };
    const segments = resolvePath(state, name);
    if (getNode(state.root, segments)) {
      return { state, output: `mkdir: cannot create directory '${name}': File exists`, error: true };
    }
    const parent = getDir(state.root, segments.slice(0, -1));
    if (!parent) return { state, output: `mkdir: cannot create directory '${name}': No such file or directory`, error: true };
    const next = clone(state);
    const nextParent = getDir(next.root, segments.slice(0, -1)) as DirNode;
    nextParent.children[segments[segments.length - 1]] = { type: "dir", children: {} };
    return { state: next, output: "", error: false };
  }

  if (cmd === "touch") {
    const name = args[0];
    if (!name) return { state, output: "touch: missing operand", error: true };
    const segments = resolvePath(state, name);
    const parent = getDir(state.root, segments.slice(0, -1));
    if (!parent) return { state, output: `touch: cannot touch '${name}': No such file or directory`, error: true };
    if (getNode(state.root, segments)) return { state, output: "", error: false };
    const next = clone(state);
    const nextParent = getDir(next.root, segments.slice(0, -1)) as DirNode;
    nextParent.children[segments[segments.length - 1]] = { type: "file", content: "" };
    return { state: next, output: "", error: false };
  }

  if (cmd === "cat") {
    const name = args[0];
    if (!name) return { state, output: "cat: missing operand", error: true };
    const node = getNode(state.root, resolvePath(state, name));
    if (!node) return { state, output: `cat: ${name}: No such file or directory`, error: true };
    if (node.type !== "file") return { state, output: `cat: ${name}: Is a directory`, error: true };
    return { state, output: node.content, error: false };
  }

  if (cmd === "echo") {
    const appendIdx = args.indexOf(">>");
    const overwriteIdx = args.indexOf(">");
    const redirectIdx = appendIdx !== -1 ? appendIdx : overwriteIdx;
    if (redirectIdx === -1) {
      return { state, output: args.join(" "), error: false };
    }
    const text = args.slice(0, redirectIdx).join(" ");
    const filename = args[redirectIdx + 1];
    if (!filename) return { state, output: "echo: missing redirect target", error: true };
    const segments = resolvePath(state, filename);
    const parent = getDir(state.root, segments.slice(0, -1));
    if (!parent) return { state, output: `echo: ${filename}: No such file or directory`, error: true };
    const existing = getNode(state.root, segments);
    if (existing && existing.type === "dir") return { state, output: `echo: ${filename}: Is a directory`, error: true };
    const next = clone(state);
    const nextParent = getDir(next.root, segments.slice(0, -1)) as DirNode;
    const name = segments[segments.length - 1];
    const prior = appendIdx !== -1 && existing?.type === "file" ? existing.content : "";
    nextParent.children[name] = { type: "file", content: prior ? `${prior}\n${text}` : text };
    return { state: next, output: "", error: false };
  }

  if (cmd === "cd") {
    const target = args[0] ?? "/home/student";
    const segments = resolvePath(state, target);
    const dir = getDir(state.root, segments);
    if (!dir) return { state, output: `cd: ${target}: No such file or directory`, error: true };
    const next = clone(state);
    next.cwd = segments;
    return { state: next, output: "", error: false };
  }

  if (cmd === "rm") {
    const recursive = args.includes("-r");
    const name = args.find((a) => a !== "-r");
    if (!name) return { state, output: "rm: missing operand", error: true };
    const segments = resolvePath(state, name);
    const node = getNode(state.root, segments);
    if (!node) return { state, output: `rm: cannot remove '${name}': No such file or directory`, error: true };
    if (node.type === "dir" && !recursive) {
      return { state, output: `rm: cannot remove '${name}': Is a directory (use -r)`, error: true };
    }
    const parent = getDir(state.root, segments.slice(0, -1));
    if (!parent) return { state, output: `rm: cannot remove '${name}'`, error: true };
    const next = clone(state);
    const nextParent = getDir(next.root, segments.slice(0, -1)) as DirNode;
    delete nextParent.children[segments[segments.length - 1]];
    return { state: next, output: "", error: false };
  }

  return { state, output: `command not found: ${cmd}. Type 'help' for supported commands.`, error: true };
}
