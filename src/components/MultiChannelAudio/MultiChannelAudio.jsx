import { useState } from "react";
import PropTypes from "prop-types";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
} from "@dnd-kit/core";
import {
  restrictToHorizontalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";

import { WavePlayer } from "../WavePlayer";
import { FileAudio } from "../FileAudio";

import css from "./MultipleChannelAudio.module.css";

export function MultiChannelAudio() {
  const [files, setFiles] = useState();

  const saveAudioFileToState = (file) => setFiles(file);

  return (
    <div className="flow">
      {!files ? (
        <FileAudio multiple onFile={saveAudioFileToState} />
      ) : (
        <ul className="border-[color:var(--clr-body)] border-4 rounded flex flex-col py-1">
          {files.map(({ id, url, name }) => (
            <WaveDraggable key={id} id={id}>
              <WavePlayer id={id} url={url} name={name} onlyName />
            </WaveDraggable>
          ))}
        </ul>
      )}
    </div>
  );
}

function WaveDraggable({ id, children }) {
  const [{ x, y }, setCoordinates] = useState({ x: 0, y: 0 });

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  return (
    <li className="border-[color:var(--clr-body)] first:border-none border-t-2 border-dashed py-2">
      <DndContext
        sensors={sensors}
        modifiers={[restrictToHorizontalAxis, restrictToParentElement]}
        onDragEnd={({ delta }) =>
          setCoordinates(({ x, y }) => ({ x: x + delta.x, y: y + delta.y }))
        }
      >
        <WaveDraggableItem id={id} style={{ top: y, left: x }}>
          {children}
        </WaveDraggableItem>
      </DndContext>
    </li>
  );
}

function WaveDraggableItem({ id, children, style }) {
  const { listeners, setNodeRef, transform } = useDraggable({
    id: id,
  });

  const elementStyle = {
    ...style,
    "--translate-x": `${transform?.x ?? 0}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={elementStyle}
      className={`relative flex items-center justify-center ${css["draggable"]}`}
      {...listeners}
    >
      {children}
      <button
        aria-label="Draggable"
        className="relative w-6 h-auto fill-gray-300 hover:fill-gray-500 hover:cursor-grab active:cursor-grabbing"
      >
        <svg viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
        </svg>
      </button>
    </div>
  );
}

WaveDraggable.propTypes = {
  children: PropTypes.element,
  id: PropTypes.string.isRequired,
};

WaveDraggableItem.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.element,
  style: PropTypes.object,
};
