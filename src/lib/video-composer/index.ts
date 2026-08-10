export type { ComposeVideoInput, ComposeVideoResult } from "./types";
export { composeSalesVideo } from "./compose";
export { resolvePublicMediaPath } from "./paths";
export {
  burnSubtitlesIntoVideo,
  burnWatermarkIntoVideo,
  getFfmpegPath,
  mergeVideoWithAudio,
  runFfmpeg,
  toFfmpegSubtitleFilterPath,
} from "./ffmpeg";
