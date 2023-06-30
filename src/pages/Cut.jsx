import { Shell, AudioCutter } from "../components";

export function Cut() {
  return (
    <Shell className="content-center text-center">
      <h1 className="text-[length:var(--fs-500)]">Cut Audio</h1>
      <p>Trim or cut any audio file online.</p>
    <AudioCutter/>

    </Shell>
  );
}
