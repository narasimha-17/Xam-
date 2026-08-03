/**
 * A from-scratch simulator for a small subset of git — enough to teach commits, branching,
 * merging, rebasing, detached HEAD, reset, and cherry-pick without touching a real repo.
 * Every command is a pure function: (state, input) -> { state, output, error }.
 */

export interface SimCommit {
  id: string;
  parents: string[];
  message: string;
  /** Lane assignment is purely cosmetic (which row the commit renders on) — it's fixed at
   * creation time to whichever branch HEAD was on, and never changes afterwards, even if the
   * owning branch is later merged, rebased, or moved. */
  lane: number;
}

export type Head = { type: "branch"; name: string } | { type: "detached"; commitId: string };

export interface RepoState {
  commits: Record<string, SimCommit>;
  order: string[];
  branches: Record<string, string | null>;
  branchLanes: Record<string, number>;
  head: Head;
  nextCommitNum: number;
  nextLane: number;
}

export interface CommandResult {
  state: RepoState;
  output: string;
  error: boolean;
}

export function createInitialState(): RepoState {
  return {
    commits: {},
    order: [],
    branches: { main: null },
    branchLanes: { main: 0 },
    head: { type: "branch", name: "main" },
    nextCommitNum: 1,
    nextLane: 1,
  };
}

function clone(state: RepoState): RepoState {
  return {
    commits: { ...state.commits },
    order: [...state.order],
    branches: { ...state.branches },
    branchLanes: { ...state.branchLanes },
    head: { ...state.head },
    nextCommitNum: state.nextCommitNum,
    nextLane: state.nextLane,
  };
}

export function currentCommitId(state: RepoState): string | null {
  if (state.head.type === "detached") return state.head.commitId;
  return state.branches[state.head.name] ?? null;
}

function currentLane(state: RepoState): number {
  if (state.head.type === "detached") return -1;
  return state.branchLanes[state.head.name] ?? 0;
}

export function ancestors(id: string | null, commits: Record<string, SimCommit>): Set<string> {
  const seen = new Set<string>();
  const stack: string[] = id ? [id] : [];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of commits[cur]?.parents ?? []) stack.push(p);
  }
  return seen;
}

export function isAncestor(a: string | null, b: string | null, commits: Record<string, SimCommit>): boolean {
  if (a === null || b === null) return false;
  return ancestors(b, commits).has(a);
}

function ancestorDistances(id: string | null, commits: Record<string, SimCommit>): Map<string, number> {
  const dist = new Map<string, number>();
  if (!id) return dist;
  const queue: [string, number][] = [[id, 0]];
  while (queue.length) {
    const [cur, d] = queue.shift() as [string, number];
    if (dist.has(cur) && (dist.get(cur) as number) <= d) continue;
    dist.set(cur, d);
    for (const p of commits[cur]?.parents ?? []) queue.push([p, d + 1]);
  }
  return dist;
}

function mergeBase(a: string | null, b: string | null, commits: Record<string, SimCommit>): string | null {
  if (!a || !b) return null;
  const distA = ancestorDistances(a, commits);
  const distB = ancestorDistances(b, commits);
  let best: string | null = null;
  let bestTotal = Infinity;
  for (const [id, da] of distA) {
    const db = distB.get(id);
    if (db === undefined) continue;
    const total = da + db;
    if (total < bestTotal) {
      bestTotal = total;
      best = id;
    }
  }
  return best;
}

/** Every commit reachable from any branch tip or (if detached) the current HEAD — used to hide
 * dangling commits after a `reset --hard`, matching real git's "unreachable = effectively gone" lesson. */
export function reachableCommitIds(state: RepoState): Set<string> {
  const tips: (string | null)[] = Object.values(state.branches);
  if (state.head.type === "detached") tips.push(state.head.commitId);
  const all = new Set<string>();
  for (const tip of tips) {
    for (const id of ancestors(tip, state.commits)) all.add(id);
  }
  return all;
}

function resolveRef(ref: string, state: RepoState): string | null {
  if (ref === "HEAD") return currentCommitId(state);
  const relMatch = ref.match(/^HEAD~(\d+)$/);
  if (relMatch) {
    let cursor = currentCommitId(state);
    let steps = parseInt(relMatch[1], 10);
    while (steps > 0 && cursor) {
      cursor = state.commits[cursor]?.parents[0] ?? null;
      steps -= 1;
    }
    return steps === 0 ? cursor : null;
  }
  if (ref in state.branches) return state.branches[ref];
  if (ref in state.commits) return ref;
  return null;
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
  git init
  git commit -m "message"
  git branch <name>
  git branch                (list branches)
  git checkout <name>
  git checkout -b <name>
  git merge <name>
  git rebase <name>
  git reset --hard <ref>
  git cherry-pick <ref>
  git log
  git status
  help`;

export function runCommand(state: RepoState, rawInput: string): CommandResult {
  const input = rawInput.trim();
  if (!input) return { state, output: "", error: false };

  if (input === "help") {
    return { state, output: HELP_TEXT, error: false };
  }

  const tokens = tokenize(input);
  if (tokens[0] !== "git") {
    return { state, output: `command not found: ${tokens[0]}. Type 'help' for supported commands.`, error: true };
  }

  const sub = tokens[1];
  const args = tokens.slice(2);

  if (sub === "init") {
    return { state: createInitialState(), output: "Initialized empty Git repository", error: false };
  }

  if (sub === "commit") {
    const mIndex = args.indexOf("-m");
    const message = mIndex !== -1 ? args[mIndex + 1] : undefined;
    if (!message) {
      return { state, output: "error: commit needs a message, e.g. git commit -m \"my message\"", error: true };
    }
    const next = clone(state);
    const parentId = currentCommitId(state);
    const id = `c${next.nextCommitNum++}`;
    next.commits[id] = { id, parents: parentId ? [parentId] : [], message, lane: currentLane(state) };
    next.order.push(id);
    if (next.head.type === "branch") {
      next.branches[next.head.name] = id;
    } else {
      next.head = { type: "detached", commitId: id };
    }
    const where = next.head.type === "branch" ? next.head.name : "detached HEAD";
    return { state: next, output: `[${where} ${id}] ${message}`, error: false };
  }

  if (sub === "branch") {
    if (args.length === 0) {
      const lines = Object.keys(state.branches).map((name) => {
        const isCurrent = state.head.type === "branch" && state.head.name === name;
        return `${isCurrent ? "* " : "  "}${name}`;
      });
      return { state, output: lines.join("\n"), error: false };
    }
    const name = args[0];
    if (name in state.branches) {
      return { state, output: `fatal: a branch named '${name}' already exists`, error: true };
    }
    const cur = currentCommitId(state);
    if (cur === null) {
      return { state, output: "fatal: not a valid object name: 'HEAD' (make a commit first)", error: true };
    }
    const next = clone(state);
    next.branches[name] = cur;
    next.branchLanes[name] = next.nextLane++;
    return { state: next, output: `Created branch '${name}'`, error: false };
  }

  if (sub === "checkout") {
    const isNewBranch = args[0] === "-b";
    const name = isNewBranch ? args[1] : args[0];
    if (!name) {
      return { state, output: "error: checkout needs a branch or commit name", error: true };
    }
    if (isNewBranch) {
      if (name in state.branches) {
        return { state, output: `fatal: a branch named '${name}' already exists`, error: true };
      }
      const next = clone(state);
      next.branches[name] = currentCommitId(state);
      next.branchLanes[name] = next.nextLane++;
      next.head = { type: "branch", name };
      return { state: next, output: `Switched to a new branch '${name}'`, error: false };
    }
    if (name in state.branches) {
      const next = clone(state);
      next.head = { type: "branch", name };
      return { state: next, output: `Switched to branch '${name}'`, error: false };
    }
    const resolved = resolveRef(name, state);
    if (resolved) {
      const next = clone(state);
      next.head = { type: "detached", commitId: resolved };
      return { state: next, output: `You are in 'detached HEAD' state at ${resolved}`, error: false };
    }
    return { state, output: `error: pathspec '${name}' did not match any branch or commit`, error: true };
  }

  if (sub === "merge") {
    const name = args[0];
    if (!name) return { state, output: "error: merge needs a branch name", error: true };
    if (state.head.type !== "branch") {
      return { state, output: "fatal: cannot merge while in detached HEAD state", error: true };
    }
    if (!(name in state.branches)) {
      return { state, output: `merge: ${name} - not something we can merge`, error: true };
    }
    const headName = state.head.name;
    const target = state.branches[name];
    const current = state.branches[headName];
    if (current === target) {
      return { state, output: "Already up to date.", error: false };
    }
    if (target !== null && isAncestor(target, current, state.commits)) {
      return { state, output: "Already up to date.", error: false };
    }
    const next = clone(state);
    if (current === null || isAncestor(current, target, state.commits)) {
      next.branches[headName] = target;
      return { state: next, output: `Fast-forward\nmerged ${name} into ${headName}`, error: false };
    }
    const id = `c${next.nextCommitNum++}`;
    next.commits[id] = {
      id,
      parents: [current, target as string],
      message: `Merge branch '${name}' into ${headName}`,
      lane: next.branchLanes[headName] ?? 0,
    };
    next.order.push(id);
    next.branches[headName] = id;
    return { state: next, output: "Merge made by the 'recursive' strategy.", error: false };
  }

  if (sub === "rebase") {
    const name = args[0];
    if (!name) return { state, output: "error: rebase needs a branch name", error: true };
    if (state.head.type !== "branch") {
      return { state, output: "fatal: cannot rebase while in detached HEAD state", error: true };
    }
    if (!(name in state.branches)) {
      return { state, output: `fatal: invalid upstream '${name}'`, error: true };
    }
    const headName = state.head.name;
    const target = state.branches[name];
    const current = state.branches[headName];
    if (current === target) return { state, output: "Current branch is up to date.", error: false };
    if (current !== null && isAncestor(current, target, state.commits)) {
      const next = clone(state);
      next.branches[headName] = target;
      return { state: next, output: "Fast-forwarded (nothing to replay).", error: false };
    }
    const base = mergeBase(current, target, state.commits);
    const toReplay: SimCommit[] = [];
    let cursor = current;
    while (cursor && cursor !== base) {
      const c = state.commits[cursor];
      if (c.parents.length > 1) {
        return {
          state,
          output: "error: rebasing a branch containing a merge commit isn't supported in this sandbox",
          error: true,
        };
      }
      toReplay.unshift(c);
      cursor = c.parents[0] ?? null;
    }
    const next = clone(state);
    let parent = target;
    for (const oldCommit of toReplay) {
      const id = `c${next.nextCommitNum++}`;
      next.commits[id] = {
        id,
        parents: parent ? [parent] : [],
        message: oldCommit.message,
        lane: next.branchLanes[headName] ?? 0,
      };
      next.order.push(id);
      parent = id;
    }
    next.branches[headName] = parent;
    return {
      state: next,
      output: `Successfully rebased and updated refs/heads/${headName}.`,
      error: false,
    };
  }

  if (sub === "reset") {
    const hardIndex = args.indexOf("--hard");
    const ref = hardIndex !== -1 ? args[hardIndex + 1] : args[0];
    if (!ref) return { state, output: "error: reset needs a ref, e.g. git reset --hard HEAD~1", error: true };
    if (state.head.type !== "branch") {
      return { state, output: "fatal: cannot reset while in detached HEAD state", error: true };
    }
    const headNameForReset = state.head.name;
    const resolved = resolveRef(ref, state);
    if (resolved === null && ref !== "HEAD") {
      return { state, output: `fatal: ambiguous argument '${ref}': unknown revision`, error: true };
    }
    const next = clone(state);
    next.branches[headNameForReset] = resolved;
    return { state: next, output: `HEAD is now at ${resolved ?? "(no commits)"}`, error: false };
  }

  if (sub === "cherry-pick") {
    const ref = args[0];
    if (!ref) return { state, output: "error: cherry-pick needs a commit id", error: true };
    const resolved = resolveRef(ref, state);
    if (!resolved) return { state, output: `fatal: bad revision '${ref}'`, error: true };
    if (state.head.type !== "branch") {
      return { state, output: "fatal: cannot cherry-pick while in detached HEAD state", error: true };
    }
    const headNameForPick = state.head.name;
    const source = state.commits[resolved];
    const next = clone(state);
    const parentId = currentCommitId(state);
    const id = `c${next.nextCommitNum++}`;
    next.commits[id] = { id, parents: parentId ? [parentId] : [], message: source.message, lane: currentLane(state) };
    next.order.push(id);
    next.branches[headNameForPick] = id;
    return { state: next, output: `[${headNameForPick} ${id}] ${source.message}`, error: false };
  }

  if (sub === "log") {
    const cur = currentCommitId(state);
    const reachable = ancestors(cur, state.commits);
    const lines = [...state.order]
      .reverse()
      .filter((id) => reachable.has(id))
      .map((id) => `${id}  ${state.commits[id].message}`);
    return { state, output: lines.length ? lines.join("\n") : "(no commits yet)", error: false };
  }

  if (sub === "status") {
    if (state.head.type === "detached") {
      return { state, output: `HEAD detached at ${state.head.commitId}`, error: false };
    }
    return { state, output: `On branch ${state.head.name}`, error: false };
  }

  return { state, output: `command not found: git ${sub}. Type 'help' for supported commands.`, error: true };
}
