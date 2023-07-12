/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
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

import converterTime from "../../helper/converterTime";
import css from "./MultipleChannelAudio.module.css";

export function MultiChannelAudio() {
  const [files, setFiles] = useState([]);
  const [mainAudioFile, setMainAudioFile] = useState();
  const [mainAudioDuration, setMainAudioDuration] = useState(0);

  const saveAudioFileToState = (file) => {
    setFiles((prev) => [...prev, ...file]);
  };

  useEffect(() => {
    if (!mainAudioDuration) return;

    const timeLineElement = document.querySelector(
      'div[data-component="timeline"]'
    );

    if (timeLineElement) {
      const draggabeListElement = document.querySelector(
        'ul[data-component="wave-draggable-list"]'
      );
      const newWidth = `calc(100% - 85ch + ${timeLineElement.clientWidth}px)`;
      draggabeListElement.style.width = newWidth;
    }
  }, [mainAudioDuration]);

  return (
    <div className="flow">
      {/* TODO: Make a zoom */}
      {/* <input
        type="range"
        min={1}
        max={6}
        value={slider}
        onChange={(e) => setSlider(parseInt(e.target.value))}
      />
      <strong className="mx-5">{slider}</strong> */}

      {!mainAudioFile ? (
        <FileAudio onFile={(file) => setMainAudioFile(...file)} />
      ) : (
        <>
          <div>
            <FileAudio
              multiple
              onFile={saveAudioFileToState}
              rounded
              className="justify-self-end md:my-1"
            />
            <div className="relative border-[color:var(--clr-body)] border-4 rounded-md flex flex-col flex-1 py-6 my-2 w-full overflow-x-auto">
              <div className="h-[36px] z-[30] absolute top-0 bg-neutral-100 rounded flex-shrink-0">
                <TimeLine duration={mainAudioDuration} />
              </div>

              <ul
                data-component="wave-draggable-list"
                className="h-full overflow-hidden rounded relative"
              >
                {files.map(({ id, url, name }) => (
                  <WaveDraggable key={id} id={id}>
                    <WavePlayerItem
                      id={id}
                      url={url}
                      name={name}
                      duration={mainAudioDuration}
                    />
                  </WaveDraggable>
                ))}
              </ul>
            </div>
          </div>

          <WavePlayer
            url={mainAudioFile?.url}
            name={mainAudioFile.name}
            onDuration={(duration) => setMainAudioDuration(duration)}
            onlyName
          />
          <div className="flex justify-between">
            <button className="button button--icon__small self-start">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">
                <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
              </svg>
            </button>

            <button className="button">Export</button>
          </div>
        </>
      )}
    </div>
  );
}

function WavePlayerItem({ duration: totalDuration, ...props }) {
  const minPxPerSec = useCallback(() => {
    const TIMELINE_PADDING = 0.9; // It's equal to 90%

    const timelineElement = document.querySelector(
      'div[data-component="timeline"]'
    );
    const widthOfTimeline = timelineElement?.clientWidth;

    return (widthOfTimeline * TIMELINE_PADDING) / totalDuration;
  }, [totalDuration]);

  return <WavePlayer {...props} minPxPerSec={minPxPerSec()} onlyName />;
}

function TimeLine({ duration, slider = 1 }) {
  const TIMELINE_PADDING = 1.1;

  const timeLineNumbers = Array.from(
    { length: Math.floor((duration * TIMELINE_PADDING) / slider) },
    (_, i) => i * slider
  );

  const lines = timeLineNumbers.map((_, i) => {
    const visibleNumber = (Math.round(i * 100) / 100) % 5 === 0;

    return (
      <div key={i} className="select-none flex flex-col items-center relative">
        {visibleNumber && (
          <>
            <small className="text-[11px] absolute bottom-[16px] text-gray-300 font-bold">
              {i === 0 ? 0 : converterTime(timeLineNumbers[i])}
            </small>
            <div className="bg-gray-300 flex-shrink-0 absolute bottom-0 w-[2px] h-[14px]"></div>
          </>
        )}
        <div className="bg-gray-300 flex-shrink-0 absolute bottom-0 w-[1px] h-[9px]"></div>
      </div>
    );
  });

  return (
    <div
      data-component="timeline"
      className="px-[4.8px] w-full h-full items-end flex"
      style={{ gap: "16px" }}
    >
      {lines}
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
    <li className="border-[color:var(--clr-body)] first:border-none border-t-2 border-dashed py-2 w-full">
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
      className={`relative flex items-center justify-center ${css["draggable"]} w-fit`}
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

TimeLine.propTypes = {
  duration: PropTypes.number,
  slider: PropTypes.number,
};

WaveDraggable.propTypes = {
  children: PropTypes.element,
  id: PropTypes.string.isRequired,
};

WaveDraggableItem.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.element,
  style: PropTypes.object,
};
