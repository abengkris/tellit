import { WoTScorer } from "./scoring";

// Web Worker for WoT scoring
 
self.onmessage = async (event: MessageEvent) => {
  const { rootPubkey, maxDepth } = event.data;

  try {
    const scorer = new WoTScorer();
    await scorer.calculateScores(rootPubkey, maxDepth);
    self.postMessage({ type: "success" });
  } catch (error) {
    self.postMessage({ type: "error", error: (error as Error).message });
  }
};
