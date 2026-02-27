// Runtime audio chunk: background music preloads first for quick playback.
const audioUrl = (fileName) => new URL(`./media/audio/${fileName}`, import.meta.url).href;

export const ASSET_AUDIO_MUSIC = {
  music: {
    url: audioUrl("music.mp3"),
    volume: 0.3,
    loop: true
  }
};
