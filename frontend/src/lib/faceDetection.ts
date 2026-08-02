import * as faceapi from "face-api.js";

let modelsLoadedPromise: Promise<void> | null = null;

export function loadFaceDetectionModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  }
  return modelsLoadedPromise;
}

export async function detectFaceCount(video: HTMLVideoElement): Promise<number> {
  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
  return detections.length;
}
