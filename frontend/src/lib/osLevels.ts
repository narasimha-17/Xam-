import { createInitialOsState, getNode, resolvePath, runShellCommand, type OsCommandResult, type OsState } from "./osSim";

export interface OsLevel {
  id: string;
  title: string;
  goal: string;
  hint: string;
  setup: string[];
  xp: number;
  check: (state: OsState, lastResult: OsCommandResult | null) => boolean;
}

export function buildOsScenario(commands: string[]): OsState {
  let state = createInitialOsState();
  for (const cmd of commands) {
    state = runShellCommand(state, cmd).state;
  }
  return state;
}

function fileContent(state: OsState, path: string): string | null {
  const node = getNode(state.root, resolvePath(state, path));
  return node && node.type === "file" ? node.content : null;
}

export const OS_LEVELS: OsLevel[] = [
  {
    id: "pwd",
    title: "Where am I",
    goal: "Print your current working directory.",
    hint: "pwd",
    setup: [],
    xp: 10,
    check: (_state, last) => !!last && !last.error && last.output === "/home/student",
  },
  {
    id: "ls",
    title: "List the directory",
    goal: "List the contents of the current directory.",
    hint: "ls",
    setup: ["touch notes.txt", "mkdir projects"],
    xp: 10,
    check: (_state, last) =>
      !!last && !last.error && last.output.includes("notes.txt") && last.output.includes("projects/"),
  },
  {
    id: "mkdir",
    title: "Make a directory",
    goal: 'Create a new directory called "backup".',
    hint: "mkdir backup",
    setup: [],
    xp: 15,
    check: (state) => {
      const node = getNode(state.root, resolvePath(state, "backup"));
      return !!node && node.type === "dir";
    },
  },
  {
    id: "touch",
    title: "Create a file",
    goal: 'Create an empty file called "todo.txt".',
    hint: "touch todo.txt",
    setup: [],
    xp: 10,
    check: (state) => {
      const node = getNode(state.root, resolvePath(state, "todo.txt"));
      return !!node && node.type === "file";
    },
  },
  {
    id: "echo-redirect",
    title: "Write to a file",
    goal: 'Write the text "hello world" into a file called "greeting.txt".',
    hint: 'echo "hello world" > greeting.txt',
    setup: [],
    xp: 15,
    check: (state) => fileContent(state, "greeting.txt") === "hello world",
  },
  {
    id: "cat",
    title: "Read a file back",
    goal: 'Print the contents of "greeting.txt".',
    hint: "cat greeting.txt",
    setup: ['echo "hello world" > greeting.txt'],
    xp: 10,
    check: (_state, last) => !!last && !last.error && last.output === "hello world",
  },
  {
    id: "cd",
    title: "Move into a directory",
    goal: 'Enter the "projects" directory.',
    hint: "cd projects",
    setup: ["mkdir projects"],
    xp: 15,
    check: (state) => state.cwd[state.cwd.length - 1] === "projects",
  },
  {
    id: "rm",
    title: "Clean up a file",
    goal: 'Delete the file "todo.txt".',
    hint: "rm todo.txt",
    setup: ["touch todo.txt"],
    xp: 15,
    check: (state) => !getNode(state.root, resolvePath(state, "todo.txt")),
  },
];
