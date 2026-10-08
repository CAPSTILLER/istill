import { assetUrl } from "@/lib/asset";

export type Sprites = {
  playerWalk: HTMLImageElement;
  playerIdle: HTMLImageElement;
  eye: HTMLImageElement;
  shard: HTMLImageElement;
  props: HTMLImageElement;
  door: HTMLImageElement;
  moth: HTMLImageElement;
  floor: HTMLImageElement;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadSprites(): Promise<Sprites> {
  const [playerWalk, playerIdle, eye, shard, props, door, moth, floor] = await Promise.all([
    loadImage(assetUrl("sprites/player-walk.png")),
    loadImage(assetUrl("sprites/player-idle.png")),
    loadImage(assetUrl("sprites/eye.png")),
    loadImage(assetUrl("sprites/shard.png")),
    loadImage(assetUrl("sprites/props.png")),
    loadImage(assetUrl("sprites/door.png")),
    loadImage(assetUrl("sprites/moth.png")),
    loadImage(assetUrl("art/floor.jpg")),
  ]);
  return { playerWalk, playerIdle, eye, shard, props, door, moth, floor };
}
