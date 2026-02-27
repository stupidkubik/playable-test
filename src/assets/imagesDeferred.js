// Runtime image chunk: deferred assets loaded after initial interactive state.
const imageUrl = (fileName) => new URL(`./media/images/${fileName}`, import.meta.url).href;

export const ASSET_IMAGES_DEFERRED = {
  failBanner: imageUrl("failBanner.png"),
  tutorialHand: imageUrl("tutorialHand.png"),
  paypalCardOriginal: imageUrl("paypalCardOriginal.webp"),
  lightsEffectOriginal: imageUrl("lightsEffectOriginal.png"),
  backdropPortrait: imageUrl("backdropPortrait.webp"),
  backdropLandscape: imageUrl("backdropLandscape.webp"),
  finishFloorPattern: imageUrl("finishFloorPattern.png"),
  finishPoleLeft: imageUrl("finishPoleLeft.png"),
  finishPoleRight: imageUrl("finishPoleRight.png"),
  finishTapeLeft: imageUrl("finishTapeLeft.png"),
  finishTapeRight: imageUrl("finishTapeRight.png"),
  confettiParticle1: imageUrl("confettiParticle1.png"),
  confettiParticle2: imageUrl("confettiParticle2.png"),
  confettiParticle3: imageUrl("confettiParticle3.png"),
  confettiParticle4: imageUrl("confettiParticle4.png"),
  confettiParticle5: imageUrl("confettiParticle5.png"),
  confettiParticle6: imageUrl("confettiParticle6.png")
};
