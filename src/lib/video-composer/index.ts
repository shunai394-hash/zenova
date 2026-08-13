export type { ComposeVideoInput, ComposeVideoResult } from "./types";
export { composeSalesVideo } from "./compose";
export { resolvePublicMediaPath } from "./paths";
export {
  burnSubtitlesIntoVideo,
  burnWatermarkIntoVideo,
  fitVideoToVerticalDuration,
  getFfmpegPath,
  mergeVideoWithAudio,
  probeDurationSec,
  runFfmpeg,
  stillImageToVerticalVideo,
  toFfmpegSubtitleFilterPath,
} from "./ffmpeg";
