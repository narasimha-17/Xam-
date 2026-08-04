/**
 * A from-scratch simulator for a small subset of kubectl — pods, deployments (with replica
 * reconciliation), and services — enough to teach the core mental model without a real cluster.
 */

export interface Pod {
  name: string;
  image: string;
  ownerDeployment: string | null;
}

export interface Deployment {
  name: string;
  image: string;
  replicas: number;
}

export interface Service {
  name: string;
  targetDeployment: string;
  port: number;
  type: "ClusterIP" | "NodePort" | "LoadBalancer";
}

export interface K8sState {
  pods: Pod[];
  deployments: Deployment[];
  services: Service[];
  nextPodNum: number;
}

export interface K8sCommandResult {
  state: K8sState;
  output: string;
  error: boolean;
}

export function createInitialK8sState(): K8sState {
  return { pods: [], deployments: [], services: [], nextPodNum: 1 };
}

function clone(state: K8sState): K8sState {
  return {
    pods: state.pods.map((p) => ({ ...p })),
    deployments: state.deployments.map((d) => ({ ...d })),
    services: state.services.map((s) => ({ ...s })),
    nextPodNum: state.nextPodNum,
  };
}

function ownedPods(state: K8sState, deploymentName: string): Pod[] {
  return state.pods.filter((p) => p.ownerDeployment === deploymentName);
}

/** Adds/removes pods owned by a deployment until the count matches its desired replicas. */
function reconcile(state: K8sState, deploymentName: string): void {
  const deployment = state.deployments.find((d) => d.name === deploymentName);
  if (!deployment) return;
  let owned = ownedPods(state, deploymentName);
  while (owned.length < deployment.replicas) {
    const pod: Pod = {
      name: `${deploymentName}-${state.nextPodNum++}`,
      image: deployment.image,
      ownerDeployment: deploymentName,
    };
    state.pods.push(pod);
    owned = ownedPods(state, deploymentName);
  }
  while (owned.length > deployment.replicas) {
    const toRemove = owned[owned.length - 1];
    state.pods = state.pods.filter((p) => p.name !== toRemove.name);
    owned = ownedPods(state, deploymentName);
  }
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

function flagValue(args: string[], flag: string): string | undefined {
  const eqPrefix = `${flag}=`;
  const eqToken = args.find((a) => a.startsWith(eqPrefix));
  if (eqToken) return eqToken.slice(eqPrefix.length);
  const idx = args.indexOf(flag);
  if (idx !== -1) return args[idx + 1];
  return undefined;
}

const HELP_TEXT = `Supported commands:
  kubectl run <name> --image=<image>
  kubectl get pods
  kubectl delete pod <name>
  kubectl create deployment <name> --image=<image>
  kubectl get deployments
  kubectl scale deployment <name> --replicas=<n>
  kubectl set image deployment/<name> <container>=<image>
  kubectl delete deployment <name>
  kubectl expose deployment <name> --port=<port> [--type=ClusterIP|NodePort|LoadBalancer]
  kubectl get services
  help`;

export function runKubectlCommand(state: K8sState, rawInput: string): K8sCommandResult {
  const input = rawInput.trim();
  if (!input) return { state, output: "", error: false };
  if (input === "help") return { state, output: HELP_TEXT, error: false };

  const tokens = tokenize(input);
  if (tokens[0] !== "kubectl") {
    return { state, output: `command not found: ${tokens[0]}. Type 'help' for supported commands.`, error: true };
  }

  const sub = tokens[1];
  const args = tokens.slice(2);

  if (sub === "run") {
    const name = args[0];
    const image = flagValue(args, "--image");
    if (!name || !image) {
      return { state, output: "error: run needs a name and --image, e.g. kubectl run web --image=nginx", error: true };
    }
    if (state.pods.some((p) => p.name === name)) {
      return { state, output: `Error from server (AlreadyExists): pods "${name}" already exists`, error: true };
    }
    const next = clone(state);
    next.pods.push({ name, image, ownerDeployment: null });
    return { state: next, output: `pod/${name} created`, error: false };
  }

  if (sub === "get" && args[0] === "pods") {
    if (state.pods.length === 0) return { state, output: "No resources found.", error: false };
    const lines = state.pods.map((p) => `${p.name}  ${p.image}  Running${p.ownerDeployment ? `  (owner: ${p.ownerDeployment})` : ""}`);
    return { state, output: lines.join("\n"), error: false };
  }

  if (sub === "delete" && args[0] === "pod") {
    const name = args[1];
    if (!name) return { state, output: "error: delete pod needs a name", error: true };
    const pod = state.pods.find((p) => p.name === name);
    if (!pod) return { state, output: `Error from server (NotFound): pods "${name}" not found`, error: true };
    if (pod.ownerDeployment) {
      const next = clone(state);
      next.pods = next.pods.filter((p) => p.name !== name);
      reconcile(next, pod.ownerDeployment);
      return { state: next, output: `pod "${name}" deleted (recreated by deployment/${pod.ownerDeployment})`, error: false };
    }
    const next = clone(state);
    next.pods = next.pods.filter((p) => p.name !== name);
    return { state: next, output: `pod "${name}" deleted`, error: false };
  }

  if (sub === "create" && args[0] === "deployment") {
    const name = args[1];
    const image = flagValue(args, "--image");
    if (!name || !image) {
      return {
        state,
        output: "error: create deployment needs a name and --image, e.g. kubectl create deployment api --image=myapp",
        error: true,
      };
    }
    if (state.deployments.some((d) => d.name === name)) {
      return { state, output: `Error from server (AlreadyExists): deployments "${name}" already exists`, error: true };
    }
    const next = clone(state);
    next.deployments.push({ name, image, replicas: 1 });
    reconcile(next, name);
    return { state: next, output: `deployment.apps/${name} created`, error: false };
  }

  if (sub === "get" && args[0] === "deployments") {
    if (state.deployments.length === 0) return { state, output: "No resources found.", error: false };
    const lines = state.deployments.map((d) => {
      const ready = ownedPods(state, d.name).length;
      return `${d.name}  ${ready}/${d.replicas} ready  image=${d.image}`;
    });
    return { state, output: lines.join("\n"), error: false };
  }

  if (sub === "scale" && args[0] === "deployment") {
    const name = args[1];
    const replicasStr = flagValue(args, "--replicas");
    const replicas = replicasStr ? parseInt(replicasStr, 10) : NaN;
    if (!name || isNaN(replicas)) {
      return {
        state,
        output: "error: scale deployment needs a name and --replicas=<n>, e.g. kubectl scale deployment api --replicas=3",
        error: true,
      };
    }
    const deployment = state.deployments.find((d) => d.name === name);
    if (!deployment) return { state, output: `Error from server (NotFound): deployments "${name}" not found`, error: true };
    const next = clone(state);
    const nd = next.deployments.find((d) => d.name === name) as Deployment;
    nd.replicas = replicas;
    reconcile(next, name);
    return { state: next, output: `deployment.apps/${name} scaled`, error: false };
  }

  if (sub === "set" && args[0] === "image") {
    const ref = args[1]; // deployment/<name>
    const assignment = args[2]; // container=image
    const name = ref?.startsWith("deployment/") ? ref.slice("deployment/".length) : undefined;
    const image = assignment?.includes("=") ? assignment.split("=")[1] : undefined;
    if (!name || !image) {
      return {
        state,
        output: "error: set image needs deployment/<name> <container>=<image>, e.g. kubectl set image deployment/api api=myapp:v2",
        error: true,
      };
    }
    const deployment = state.deployments.find((d) => d.name === name);
    if (!deployment) return { state, output: `Error from server (NotFound): deployments "${name}" not found`, error: true };
    const next = clone(state);
    const nd = next.deployments.find((d) => d.name === name) as Deployment;
    nd.image = image;
    for (const p of next.pods) {
      if (p.ownerDeployment === name) p.image = image;
    }
    return { state: next, output: `deployment.apps/${name} image updated`, error: false };
  }

  if (sub === "delete" && args[0] === "deployment") {
    const name = args[1];
    if (!name) return { state, output: "error: delete deployment needs a name", error: true };
    if (!state.deployments.some((d) => d.name === name)) {
      return { state, output: `Error from server (NotFound): deployments "${name}" not found`, error: true };
    }
    const next = clone(state);
    next.deployments = next.deployments.filter((d) => d.name !== name);
    next.pods = next.pods.filter((p) => p.ownerDeployment !== name);
    return { state: next, output: `deployment.apps "${name}" deleted`, error: false };
  }

  if (sub === "expose" && args[0] === "deployment") {
    const name = args[1];
    const portStr = flagValue(args, "--port");
    const port = portStr ? parseInt(portStr, 10) : NaN;
    const type = (flagValue(args, "--type") ?? "ClusterIP") as Service["type"];
    if (!name || isNaN(port)) {
      return {
        state,
        output: "error: expose deployment needs a name and --port=<port>, e.g. kubectl expose deployment api --port=80",
        error: true,
      };
    }
    if (!state.deployments.some((d) => d.name === name)) {
      return { state, output: `Error from server (NotFound): deployments "${name}" not found`, error: true };
    }
    if (state.services.some((s) => s.name === name)) {
      return { state, output: `Error from server (AlreadyExists): services "${name}" already exists`, error: true };
    }
    const next = clone(state);
    next.services.push({ name, targetDeployment: name, port, type });
    return { state: next, output: `service/${name} exposed`, error: false };
  }

  if (sub === "get" && args[0] === "services") {
    if (state.services.length === 0) return { state, output: "No resources found.", error: false };
    const lines = state.services.map((s) => `${s.name}  ${s.type}  port=${s.port}  -> deployment/${s.targetDeployment}`);
    return { state, output: lines.join("\n"), error: false };
  }

  return { state, output: `command not found: kubectl ${sub} ${args[0] ?? ""}. Type 'help' for supported commands.`, error: true };
}
