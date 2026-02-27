// Runtime audio chunk: short effects that can be loaded after first paint.
const audioUrl = (fileName) => new URL(`./media/audio/${fileName}`, import.meta.url).href;

export const ASSET_AUDIO_SFX = {
  jump: {
    url: audioUrl("jump.mp3"),
    volume: 0.5
  },
  hit: {
    url: audioUrl("hit.mp3"),
    volume: 0.6
  },
  collect: {
    url: audioUrl("collect.mp3"),
    volume: 0.35
  },
  hurt: {
    url: audioUrl("hurt.mp3"),
    volume: 0.7
  },
  step: {
    url: audioUrl("step.mp3"),
    volume: 0.3
  },
  lose: {
    url: audioUrl("lose.mp3"),
    volume: 0.8
  },
  win: {
    url: audioUrl("win.mp3"),
    volume: 0.8
  }
};
