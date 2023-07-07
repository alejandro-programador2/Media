import { MultiChannelAudio, Shell } from "../components";

export function MultiChannel() {
  return (
    <Shell className="content-center text-center">
      <h1 className="text-[length:var(--fs-500)]">Multi-channel Audio</h1>
      <p>Merge two or more audios into a single multi-channel audio file.</p>
      <MultiChannelAudio />
    </Shell>
  );
}
