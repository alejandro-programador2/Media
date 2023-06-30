import { useRef, useState } from "react";
import { FileAudio } from "../FileAudio";
import { WavePlayer } from "../WavePlayer";
import cutAudio from "../../helper/cutAudio";

export function AudioCutter() {
  const [file, setFile] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const waveplayerRef = useRef();
  const region = useRef({});

  const setRegionTime = (time) => {
    region.current = {
      ...time,
    };
  };

  const handleFile = (file) => {
    setFile(...file);
  };

  const handleClick = async () => {
    waveplayerRef.current.TogglePlay();
    setIsPlaying(!isPlaying);
  };

  const downloadAudio = ({ url, name }) => {
    const downloadAudio = document.createElement("a");
    downloadAudio.href = url;
    downloadAudio.style.display = "none";

    downloadAudio.setAttribute("download", name);
    downloadAudio.click();
  };

  const handleExport = async () => {
    const { startRegion, endRegion } = region.current;

    try {
      const newAudio = await cutAudio({
        file: file.file,
        startTime: startRegion,
        endTime: endRegion,
      });

      downloadAudio(newAudio);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flow">
      {!file ? (
        <FileAudio onFile={handleFile} />
      ) : (
        <>
          <WavePlayer
            ref={waveplayerRef}
            url={file?.url}
            onRegionTime={setRegionTime}
          />
          <div className="flex justify-between">
            <button
              className="button button--icon__small self-start"
              onClick={handleClick}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                  <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
                </svg>
              )}
            </button>

            <button className="button" onClick={handleExport}>
              Export
            </button>
          </div>
        </>
      )}
    </div>
  );
}
