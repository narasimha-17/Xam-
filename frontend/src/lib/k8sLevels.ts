import { createInitialK8sState, runKubectlCommand, type K8sState } from "./k8sSim";

export interface K8sLevel {
  id: string;
  title: string;
  goal: string;
  hint: string;
  setup: string[];
  xp: number;
  check: (state: K8sState) => boolean;
}

export function buildK8sScenario(commands: string[]): K8sState {
  let state = createInitialK8sState();
  for (const cmd of commands) {
    state = runKubectlCommand(state, cmd).state;
  }
  return state;
}

export const K8S_LEVELS: K8sLevel[] = [
  {
    id: "run-pod",
    title: "Run your first pod",
    goal: 'Run a standalone pod named "web" from the nginx image.',
    hint: "kubectl run web --image=nginx",
    setup: [],
    xp: 10,
    check: (state) => state.pods.some((p) => p.name === "web" && p.ownerDeployment === null),
  },
  {
    id: "create-deployment",
    title: "Create a deployment",
    goal: 'Create a deployment named "api" from the myapp image.',
    hint: "kubectl create deployment api --image=myapp",
    setup: [],
    xp: 15,
    check: (state) => {
      const d = state.deployments.find((d) => d.name === "api");
      return !!d && state.pods.filter((p) => p.ownerDeployment === "api").length === d.replicas;
    },
  },
  {
    id: "scale-up",
    title: "Scale it out",
    goal: 'Scale the "api" deployment to 3 replicas.',
    hint: "kubectl scale deployment api --replicas=3",
    setup: ["kubectl create deployment api --image=myapp"],
    xp: 20,
    check: (state) => {
      const d = state.deployments.find((d) => d.name === "api");
      return !!d && d.replicas === 3 && state.pods.filter((p) => p.ownerDeployment === "api").length === 3;
    },
  },
  {
    id: "scale-down",
    title: "Scale it back down",
    goal: 'The "api" deployment is running 3 replicas — scale it back down to 1.',
    hint: "kubectl scale deployment api --replicas=1",
    setup: ["kubectl create deployment api --image=myapp", "kubectl scale deployment api --replicas=3"],
    xp: 15,
    check: (state) => {
      const d = state.deployments.find((d) => d.name === "api");
      return !!d && d.replicas === 1 && state.pods.filter((p) => p.ownerDeployment === "api").length === 1;
    },
  },
  {
    id: "expose-service",
    title: "Expose a service",
    goal: 'Expose the "api" deployment on port 80 as a ClusterIP service.',
    hint: "kubectl expose deployment api --port=80 --type=ClusterIP",
    setup: ["kubectl create deployment api --image=myapp"],
    xp: 20,
    check: (state) => state.services.some((s) => s.targetDeployment === "api" && s.port === 80),
  },
  {
    id: "delete-pod",
    title: "Clean up a stray pod",
    goal: 'A standalone pod named "debug" is left over — delete it.',
    hint: "kubectl delete pod debug",
    setup: ["kubectl run debug --image=busybox"],
    xp: 10,
    check: (state) => !state.pods.some((p) => p.name === "debug"),
  },
  {
    id: "set-image",
    title: "Roll out a new image",
    goal: 'Update the "api" deployment to use the myapp:v2 image.',
    hint: "kubectl set image deployment/api api=myapp:v2",
    setup: ["kubectl create deployment api --image=myapp"],
    xp: 20,
    check: (state) => {
      const d = state.deployments.find((d) => d.name === "api");
      return !!d && d.image === "myapp:v2" && state.pods.filter((p) => p.ownerDeployment === "api").every((p) => p.image === "myapp:v2");
    },
  },
  {
    id: "delete-deployment",
    title: "Tear down a deployment",
    goal: 'Delete the "api" deployment entirely, along with its pods.',
    hint: "kubectl delete deployment api",
    setup: ["kubectl create deployment api --image=myapp"],
    xp: 15,
    check: (state) => !state.deployments.some((d) => d.name === "api") && !state.pods.some((p) => p.ownerDeployment === "api"),
  },
];
