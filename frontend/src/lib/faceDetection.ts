import * as faceapi from "face-api.js";

let modelsLoadedPromise: Promise<void> | null = null;

export function loadFaceDetectionModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  }
  return modelsLoadedPromise;
}

export async function detectFacePresent(video: HTMLVideoElement): Promise<boolean> {
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
  return detection !== undefined;
}
