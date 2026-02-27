// Runtime image chunk: critical assets loaded before first playable frame.
const imageUrl = (fileName) => new URL(`./media/images/${fileName}`, import.meta.url).href;

export const ASSET_IMAGES_CRITICAL = {
  playerSheet: imageUrl("playerSheet.png"),
  enemySheet: imageUrl("enemySheet.png"),
  hudCounter: imageUrl("hudCounter.webp"),
  collectibleIcon: imageUrl("collectibleIcon.png"),
  collectiblePaypalCard: imageUrl("collectiblePaypalCard.png"),
  sceneBackground: imageUrl("sceneBackground.png"),
  sceneTreeLeft: imageUrl("sceneTreeLeft.png"),
  sceneTreeRight: imageUrl("sceneTreeRight.png"),
  sceneBushLarge: imageUrl("sceneBushLarge.png"),
  sceneBushMedium: imageUrl("sceneBushMedium.png"),
  sceneBushSmall: imageUrl("sceneBushSmall.png"),
  sceneLamp: imageUrl("sceneLamp.png"),
  obstacleSprite: imageUrl("obstacleSprite.webp"),
  obstacleGlow: imageUrl("obstacleGlow.webp")
};
