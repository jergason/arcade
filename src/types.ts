export type TileType = 0 | 1 | 2 | 3; // floor, wall, player start, exit

export interface CameraDef {
  col: number;
  row: number;
  wallCol: number;
  wallRow: number;
  baseAngle: number;
  sweep: number;
  speed: number;
}

export interface CameraState extends CameraDef {
  x: number;
  y: number;
  currentAngle: number;
  time: number;
  detected: boolean;
}

export interface Point {
  x: number;
  y: number;
}
