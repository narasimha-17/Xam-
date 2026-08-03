import { createInitialDockerState, runDockerCommand, type DockerState } from "./dockerSim";

export interface DockerLevel {
  id: string;
  title: string;
  goal: string;
  hint: string;
  setup: string[];
  xp: number;
  check: (state: DockerState) => boolean;
}

export function buildDockerScenario(commands: string[]): DockerState {
  let state = createInitialDockerState();
  for (const cmd of commands) {
    state = runDockerCommand(state, cmd).state;
  }
  return state;
}

export const DOCKER_LEVELS: DockerLevel[] = [
  {
    id: "build-image",
    title: "Build your first image",
    goal: 'Build an image tagged "myapp".',
    hint: "docker build -t myapp .",
    setup: [],
    xp: 10,
    check: (state) => state.images.some((i) => i.name === "myapp"),
  },
  {
    id: "run-container",
    title: "Run a container",
    goal: 'Run a container named "web" from the myapp image.',
    hint: "docker run --name web myapp",
    setup: ["docker build -t myapp ."],
    xp: 15,
    check: (state) => state.containers.some((c) => c.name === "web" && c.status === "running"),
  },
  {
    id: "publish-port",
    title: "Publish a port",
    goal: 'Run a container named "api" from myapp, publishing host port 8080 to container port 80.',
    hint: "docker run --name api -p 8080:80 myapp",
    setup: ["docker build -t myapp ."],
    xp: 15,
    check: (state) =>
      state.containers.some((c) => c.name === "api" && c.ports.some((p) => p.host === 8080 && p.container === 80)),
  },
  {
    id: "stop-container",
    title: "Stop a container",
    goal: 'Stop the "web" container.',
    hint: "docker stop web",
    setup: ["docker build -t myapp .", "docker run --name web myapp"],
    xp: 15,
    check: (state) => {
      const c = state.containers.find((c) => c.name === "web");
      return !!c && c.status === "exited";
    },
  },
  {
    id: "remove-container",
    title: "Clean up a container",
    goal: 'The "web" container is already stopped — remove it completely.',
    hint: "docker rm web",
    setup: ["docker build -t myapp .", "docker run --name web myapp", "docker stop web"],
    xp: 15,
    check: (state) => !state.containers.some((c) => c.name === "web"),
  },
  {
    id: "scale-out",
    title: "Scale out",
    goal: "Run three containers from the myapp image, named web1, web2, and web3.",
    hint: "docker run --name web1 myapp (repeat for web2 and web3)",
    setup: ["docker build -t myapp ."],
    xp: 20,
    check: (state) =>
      ["web1", "web2", "web3"].every((n) => state.containers.some((c) => c.name === n && c.status === "running")),
  },
  {
    id: "remove-image",
    title: "Clean up an image",
    goal: "Stop and remove the web container using myapp, then remove the myapp image itself.",
    hint: "docker stop web, then docker rm web, then docker rmi myapp",
    setup: ["docker build -t myapp .", "docker run --name web myapp"],
    xp: 20,
    check: (state) => !state.images.some((i) => i.name === "myapp"),
  },
];
