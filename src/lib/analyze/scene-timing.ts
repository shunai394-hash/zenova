/**
 * シーン秒数の割り当て — 合計が duration に一致し、重複・抜けなし。
 */

export type TimedScene = {
  startSec: number;
  endSec: number;
  second: string;
};

/**
 * duration 秒を n シーンへ分割。
 * 6シーン×30秒なら例: 0-4, 4-8, 8-13, 13-18, 18-24, 24-30
 */
export function allocateSceneSeconds(
  duration: number,
  sceneCount: number
): TimedScene[] {
  const n = Math.max(1, Math.floor(sceneCount));
  const total = Math.max(1, Math.round(duration));

  // よく使うパターンを優先
  const presets: Record<string, number[]> = {
    "15:4": [0, 3, 7, 12, 15],
    "15:5": [0, 3, 6, 10, 13, 15],
    "15:6": [0, 2, 5, 8, 11, 13, 15],
    "30:5": [0, 4, 10, 18, 25, 30],
    "30:6": [0, 4, 8, 13, 18, 24, 30],
    "45:6": [0, 6, 12, 20, 28, 37, 45],
    "60:6": [0, 8, 16, 28, 40, 50, 60],
  };

  const key = `${total}:${n}`;
  let marks = presets[key];

  if (!marks || marks.length !== n + 1) {
    marks = [0];
    for (let i = 1; i < n; i++) {
      marks.push(Math.round((total * i) / n));
    }
    marks.push(total);
    // 重複マークを解消
    for (let i = 1; i < marks.length; i++) {
      if (marks[i]! <= marks[i - 1]!) {
        marks[i] = marks[i - 1]! + 1;
      }
    }
    marks[marks.length - 1] = total;
    // オーバーしたら後ろから圧縮
    for (let i = marks.length - 2; i >= 0; i--) {
      if (marks[i]! >= marks[i + 1]!) {
        marks[i] = Math.max(0, marks[i + 1]! - 1);
      }
    }
    marks[0] = 0;
    marks[marks.length - 1] = total;
  }

  const scenes: TimedScene[] = [];
  for (let i = 0; i < n; i++) {
    const startSec = marks[i]!;
    const endSec = marks[i + 1]!;
    scenes.push({
      startSec,
      endSec,
      second: `${startSec}-${endSec}`,
    });
  }
  return scenes;
}

export function formatTimelineLines(
  scenes: { scene: string; text: string }[],
  duration: number
): { second: string; scene: string; text: string }[] {
  const slots = allocateSceneSeconds(duration, scenes.length);
  return scenes.map((s, i) => ({
    second: slots[i]?.second ?? `${i}`,
    scene: s.scene,
    text: s.text.slice(0, 80),
  }));
}
