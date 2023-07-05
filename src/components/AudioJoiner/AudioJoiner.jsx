import { useState } from "react";
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

  const handleFile = (file) => {
    setFiles(file);
  };

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

  const downloadAudio = ({ url, name }) => {
    const downloadAudio = document.createElement("a");
    downloadAudio.href = url;
    downloadAudio.style.display = "none";

    downloadAudio.setAttribute("download", name);
    downloadAudio.click();
  };

  const handleExport = async () => {
    try {
      const newAudio = await joinAudio({ files });
      downloadAudio(newAudio);
    } catch (error) {
      console.error(error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="flow">
      {!files ? (
        <FileAudio multiple onFile={handleFile} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={files} strategy={verticalListSortingStrategy}>
            {files.map(({ id, url }) => (
              <WaveSortable key={id} id={id}>
                <WavePlayer
                  url={url}
                  onRegionTime={(region) => handleRegion({ id, region })}
                />
              </WaveSortable>
            ))}
            <div className="flex justify-between">
              {/* TODO: Make the play funcionatily */}
              <button className="button button--icon__small self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                  <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
                </svg>
              </button>

              <button className="button" onClick={handleExport}>
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
    <div
      ref={setNodeRef}
      className="border-4 border-orange-400"
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

WaveSortable.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.element,
};
