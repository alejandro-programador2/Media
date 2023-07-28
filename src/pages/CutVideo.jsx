import { Shell, VideoCutter } from "../components";

export function CutVideo() {
  return (
    <Shell className="content-center text-center">
      <h1 className="text-[length:var(--fs-500)]">Cut Video</h1>
      <p>Trim or cut any video file online.</p>
      <VideoCutter />
    </Shell>
  );
}
