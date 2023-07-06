import { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { FileAudio } from "../FileAudio";
import { WavePlayer } from "../WavePlayer";

import joinAudio from "../../helper/joinAudio";

export function AudioJoiner() {
  const [files, setFiles] = useState();
  const [toggleRef, setToggleRef] = useState(0);
  const [playbackIconState, setPlaybackIconState] = useState(false);

  const [playerOptions, setPlayerOptions] = useState();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const wavePlayerRef = useCallback((options) => {
    if (!options) return;

    setPlayerOptions((prev) => {
      if (prev?.isPlaying()) {
        prev.TogglePlay();
      }
      return { ...options };
    });
  }, []);

  const saveAudioFileToState = (file) => setFiles(file);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRegion = ({ id, region }) => {
    const { startRegion, endRegion } = region;

    setFiles((state) => {
      const fileIndex = state.findIndex((file) => file.id === id);

      if (fileIndex >= 0) {
        const newState = [
          ...state.slice(0, fileIndex),
          { ...state[fileIndex], startTime: startRegion, endTime: endRegion },
          ...state.slice(fileIndex + 1),
        ];
        return newState;
      }

      return state;
    });
  };

  const handleClick = (index) => {
    if (playbackIconState) setPlaybackIconState(!playbackIconState);
    setToggleRef(index);
  };

  const toggleAudioPlayback = () => {
    playerOptions?.TogglePlay();
    setPlaybackIconState(!playbackIconState);
  };

  const createDownloadAudioLink = ({ url, name }) => {
    const downloadAudio = document.createElement("a");
    downloadAudio.href = url;
    downloadAudio.style.display = "none";

    downloadAudio.setAttribute("download", name);
    downloadAudio.click();
  };

  const exportAudioFile = async () => {
    try {
      const newAudio = await joinAudio({ files });
      createDownloadAudioLink(newAudio);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flow">
      {!files ? (
        <FileAudio multiple onFile={saveAudioFileToState} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={files} strategy={verticalListSortingStrategy}>
            {files.map(({ id, url, name }, index) => (
              <WaveSortable key={id} id={id}>
                <WavePlayer
                  id={id}
                  url={url}
                  name={name}
                  onClick={() => handleClick(index)}
                  onRegionTime={(region) => handleRegion({ id, region })}
                  {...(toggleRef === index && { ref: wavePlayerRef })}
                />
              </WaveSortable>
            ))}
            <div className="flex justify-between">
              <button
                className="button button--icon__small self-start"
                onClick={toggleAudioPlayback}
              >
                {playbackIconState ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                    <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                    <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
                  </svg>
                )}
              </button>

              <button className="button" onClick={exportAudioFile}>
                Export
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function WaveSortable({ children, id }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div style={style} className="flex items-center cursor-default">
      {children}
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="w-3.5 ms-1 mt-3 fill-gray-300 hover:fill-gray-500 hover:cursor-grab active:cursor-grabbing"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
          <path d="M40 352l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zm192 0l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zM40 320c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0zM232 192l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40zM40 160c-22.1 0-40-17.9-40-40L0 72C0 49.9 17.9 32 40 32l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0zM232 32l48 0c22.1 0 40 17.9 40 40l0 48c0 22.1-17.9 40-40 40l-48 0c-22.1 0-40-17.9-40-40l0-48c0-22.1 17.9-40 40-40z" />
        </svg>
      </button>
    </div>
  );
}

WaveSortable.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.element,
};
