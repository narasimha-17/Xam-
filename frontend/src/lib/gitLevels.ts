import { createInitialState, isAncestor, runCommand, type RepoState } from "./gitSim";

export interface GitLevel {
  id: string;
  title: string;
  goal: string;
  hint: string;
  setup: string[];
  xp: number;
  check: (state: RepoState) => boolean;
}

export function buildScenario(commands: string[]): RepoState {
  let state = createInitialState();
  for (const cmd of commands) {
    state = runCommand(state, cmd).state;
  }
  return state;
}

export const GIT_LEVELS: GitLevel[] = [
  {
    id: "first-commit",
    title: "Your first commit",
    goal: "Every repo starts empty. Make your first commit on main.",
    hint: 'Try: git commit -m "Initial commit"',
    setup: ["git init"],
    xp: 10,
    check: (state) => Object.keys(state.commits).length >= 1,
  },
  {
    id: "branch-out",
    title: "Branch out",
    goal: "Create a new branch called 'feature', switch to it, and make a commit there.",
    hint: 'git checkout -b feature, then git commit -m "add feature"',
    setup: ["git init", 'git commit -m "Initial commit"'],
    xp: 15,
    check: (state) => {
      const featureTip = state.branches["feature"];
      const mainTip = state.branches["main"];
      return featureTip !== undefined && featureTip !== null && featureTip !== mainTip;
    },
  },
  {
    id: "fast-forward",
    title: "Fast-forward merge",
    goal: "main hasn't moved since you branched. Merge 'feature' back into main — git will just fast-forward the pointer.",
    hint: "git checkout main, then git merge feature",
    setup: ["git init", 'git commit -m "Initial commit"', "git checkout -b feature", 'git commit -m "add feature"'],
    xp: 15,
    check: (state) => {
      const mainTip = state.branches["main"];
      return mainTip !== null && mainTip === state.branches["feature"];
    },
  },
  {
    id: "three-way-merge",
    title: "A real merge commit",
    goal: "Both main and feature have moved on now. Merge feature into main — this time it needs an actual merge commit.",
    hint: "git checkout main, then git merge feature",
    setup: [
      "git init",
      'git commit -m "Initial commit"',
      "git checkout -b feature",
      'git commit -m "add feature"',
      "git checkout main",
      'git commit -m "fix on main"',
    ],
    xp: 20,
    check: (state) => {
      const mainTip = state.branches["main"];
      const featureTip = state.branches["feature"];
      if (!mainTip) return false;
      const tip = state.commits[mainTip];
      return tip.parents.length === 2 && isAncestor(featureTip, mainTip, state.commits);
    },
  },
  {
    id: "rebase",
    title: "Rebase for a clean line",
    goal: "Instead of merging, rebase feature onto main so its commits replay on top and history stays linear.",
    hint: "git checkout feature, then git rebase main",
    setup: [
      "git init",
      'git commit -m "Initial commit"',
      "git checkout -b feature",
      'git commit -m "add feature"',
      "git checkout main",
      'git commit -m "fix on main"',
    ],
    xp: 25,
    check: (state) => {
      const featureTip = state.branches["feature"];
      const mainTip = state.branches["main"];
      if (!featureTip || !mainTip) return false;
      const tip = state.commits[featureTip];
      return tip.parents.length === 1 && isAncestor(mainTip, featureTip, state.commits);
    },
  },
  {
    id: "detached-head",
    title: "Time travel with detached HEAD",
    goal: "Check out the very first commit directly by its id (not a branch name) to look around in detached HEAD state.",
    hint: "git log to find a commit id, then git checkout <id>",
    setup: ["git init", 'git commit -m "c1"', 'git commit -m "c2"', 'git commit -m "c3"'],
    xp: 15,
    check: (state) => state.head.type === "detached",
  },
  {
    id: "reset-hard",
    title: "Undo with reset --hard",
    goal: "That last commit was a mistake. Move main back one commit, permanently discarding it.",
    hint: "git reset --hard HEAD~1",
    setup: ["git init", 'git commit -m "c1"', 'git commit -m "c2"', 'git commit -m "oops, bad commit"'],
    xp: 20,
    check: (state) => {
      const mainTip = state.branches["main"];
      return !!mainTip && state.commits[mainTip]?.message === "c2";
    },
  },
  {
    id: "cherry-pick",
    title: "Cherry-pick a fix",
    goal: "main needs one specific fix from the hotfix branch — without merging the whole thing. Grab just that commit.",
    hint: "git checkout hotfix and git log to find the commit id, then git checkout main and git cherry-pick <id>",
    setup: ["git init", 'git commit -m "c1"', "git checkout -b hotfix", 'git commit -m "critical fix"', "git checkout main"],
    xp: 20,
    check: (state) => {
      const mainTip = state.branches["main"];
      return !!mainTip && state.commits[mainTip]?.message === "critical fix";
    },
  },
];
