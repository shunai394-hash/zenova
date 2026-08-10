export type { NarrationResult, NarrationSceneInput } from "./types";
export { generateNarrationScript, buildFallbackNarrationScript } from "./script";
export {
  getElevenLabsApiKey,
  getElevenLabsModelId,
  getElevenLabsVoiceId,
  synthesizeSpeechMp3,
} from "./elevenlabs";
export {
  generateSalesNarration,
  parseNarrationInputFromBody,
} from "./generate";
