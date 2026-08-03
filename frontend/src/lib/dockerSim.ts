/**
 * A from-scratch simulator for a small subset of the docker CLI — images and containers,
 * enough to teach build/run/ps/stop/rm/rmi and the constraints docker enforces between them,
 * without needing a real docker daemon.
 */

export interface DockerImage {
  name: string;
  tag: string;
}

export interface PortMapping {
  host: number;
  container: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string; // "name:tag"
  status: "running" | "exited";
  ports: PortMapping[];
}

export interface DockerState {
  images: DockerImage[];
  containers: DockerContainer[];
  nextContainerNum: number;
}

export interface DockerCommandResult {
  state: DockerState;
  output: string;
  error: boolean;
}

export function createInitialDockerState(): DockerState {
  return { images: [], containers: [], nextContainerNum: 1 };
}

function clone(state: DockerState): DockerState {
  return {
    images: state.images.map((i) => ({ ...i })),
    containers: state.containers.map((c) => ({ ...c, ports: c.ports.map((p) => ({ ...p })) })),
    nextContainerNum: state.nextContainerNum,
  };
}

export function imageRef(image: DockerImage): string {
  return `${image.name}:${image.tag}`;
}

function parseImageRef(raw: string): { name: string; tag: string } {
  const [name, tag] = raw.split(":");
  return { name, tag: tag || "latest" };
}

function findContainer(state: DockerState, nameOrId: string): DockerContainer | undefined {
  return state.containers.find((c) => c.name === nameOrId || c.id === nameOrId);
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
  docker build -t <name[:tag]> .
  docker images
  docker run [--name <name>] [-d] [-p <host>:<container>] <image>
  docker ps [-a]
  docker stop <name>
  docker start <name>
  docker rm <name>
  docker rmi <image>
  docker logs <name>
  help`;

export function runDockerCommand(state: DockerState, rawInput: string): DockerCommandResult {
  const input = rawInput.trim();
  if (!input) return { state, output: "", error: false };

  if (input === "help") return { state, output: HELP_TEXT, error: false };

  const tokens = tokenize(input);
  if (tokens[0] !== "docker") {
    return { state, output: `command not found: ${tokens[0]}. Type 'help' for supported commands.`, error: true };
  }

  const sub = tokens[1];
  const args = tokens.slice(2);

  if (sub === "build") {
    const tIndex = args.indexOf("-t");
    const rawTag = tIndex !== -1 ? args[tIndex + 1] : undefined;
    if (!rawTag) {
      return { state, output: "error: build needs a tag, e.g. docker build -t myapp .", error: true };
    }
    const { name, tag } = parseImageRef(rawTag);
    const next = clone(state);
    const existing = next.images.find((i) => i.name === name && i.tag === tag);
    if (!existing) next.images.push({ name, tag });
    return {
      state: next,
      output: `Successfully built and tagged ${name}:${tag}`,
      error: false,
    };
  }

  if (sub === "images") {
    if (state.images.length === 0) return { state, output: "(no images yet)", error: false };
    return { state, output: state.images.map((i) => `${i.name}:${i.tag}`).join("\n"), error: false };
  }

  if (sub === "run") {
    const nameIndex = args.indexOf("--name");
    const name = nameIndex !== -1 ? args[nameIndex + 1] : undefined;
    const pIndex = args.indexOf("-p");
    const portArg = pIndex !== -1 ? args[pIndex + 1] : undefined;
    const positional = args.filter(
      (a, i) => a !== "-d" && !(nameIndex !== -1 && (i === nameIndex || i === nameIndex + 1)) && !(pIndex !== -1 && (i === pIndex || i === pIndex + 1)),
    );
    const imageArg = positional[positional.length - 1];
    if (!imageArg) {
      return { state, output: "error: run needs an image, e.g. docker run --name web myapp", error: true };
    }
    const { name: imgName, tag: imgTag } = parseImageRef(imageArg);
    const image = state.images.find((i) => i.name === imgName && i.tag === imgTag);
    if (!image) {
      return { state, output: `Unable to find image '${imageArg}' locally`, error: true };
    }
    const next = clone(state);
    const containerName = name ?? `container${next.nextContainerNum}`;
    if (findContainer(next, containerName)) {
      return { state, output: `docker: Conflict. The container name "${containerName}" is already in use.`, error: true };
    }
    const ports: PortMapping[] = [];
    if (portArg) {
      const [hostStr, containerStr] = portArg.split(":");
      const host = parseInt(hostStr, 10);
      const container = parseInt(containerStr, 10);
      if (!isNaN(host) && !isNaN(container)) ports.push({ host, container });
    }
    const id = `d${next.nextContainerNum++}`;
    next.containers.push({ id, name: containerName, image: `${imgName}:${imgTag}`, status: "running", ports });
    return { state: next, output: containerName, error: false };
  }

  if (sub === "ps") {
    const showAll = args.includes("-a");
    const rows = state.containers.filter((c) => showAll || c.status === "running");
    if (rows.length === 0) return { state, output: "(no containers)", error: false };
    const lines = rows.map((c) => {
      const ports = c.ports.map((p) => `${p.host}->${p.container}`).join(", ");
      return `${c.id}  ${c.image}  ${c.status}  ${c.name}${ports ? `  ports: ${ports}` : ""}`;
    });
    return { state, output: lines.join("\n"), error: false };
  }

  if (sub === "stop") {
    const name = args[0];
    if (!name) return { state, output: "error: stop needs a container name", error: true };
    const container = findContainer(state, name);
    if (!container) return { state, output: `Error: No such container: ${name}`, error: true };
    if (container.status === "exited") return { state, output: `${name} is already stopped`, error: false };
    const next = clone(state);
    (findContainer(next, name) as DockerContainer).status = "exited";
    return { state: next, output: name, error: false };
  }

  if (sub === "start") {
    const name = args[0];
    if (!name) return { state, output: "error: start needs a container name", error: true };
    const container = findContainer(state, name);
    if (!container) return { state, output: `Error: No such container: ${name}`, error: true };
    if (container.status === "running") return { state, output: `${name} is already running`, error: false };
    const next = clone(state);
    (findContainer(next, name) as DockerContainer).status = "running";
    return { state: next, output: name, error: false };
  }

  if (sub === "rm") {
    const name = args[0];
    if (!name) return { state, output: "error: rm needs a container name", error: true };
    const container = findContainer(state, name);
    if (!container) return { state, output: `Error: No such container: ${name}`, error: true };
    if (container.status === "running") {
      return {
        state,
        output: `Error response from daemon: You cannot remove a running container ${container.id}. Stop the container before attempting removal.`,
        error: true,
      };
    }
    const next = clone(state);
    next.containers = next.containers.filter((c) => c.name !== name && c.id !== name);
    return { state: next, output: name, error: false };
  }

  if (sub === "rmi") {
    const raw = args[0];
    if (!raw) return { state, output: "error: rmi needs an image name", error: true };
    const { name, tag } = parseImageRef(raw);
    const image = state.images.find((i) => i.name === name && i.tag === tag);
    if (!image) return { state, output: `Error: No such image: ${raw}`, error: true };
    const ref = `${name}:${tag}`;
    const inUse = state.containers.find((c) => c.image === ref);
    if (inUse) {
      return {
        state,
        output: `Error response from daemon: conflict: unable to remove repository reference "${ref}" (must force) - container ${inUse.id} is using its referenced image`,
        error: true,
      };
    }
    const next = clone(state);
    next.images = next.images.filter((i) => !(i.name === name && i.tag === tag));
    return { state: next, output: `Untagged: ${ref}`, error: false };
  }

  if (sub === "logs") {
    const name = args[0];
    if (!name) return { state, output: "error: logs needs a container name", error: true };
    const container = findContainer(state, name);
    if (!container) return { state, output: `Error: No such container: ${name}`, error: true };
    return { state, output: `[${container.name}] Server started, listening for connections...`, error: false };
  }

  return { state, output: `command not found: docker ${sub}. Type 'help' for supported commands.`, error: true };
}
