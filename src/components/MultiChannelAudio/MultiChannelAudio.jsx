/* eslint-disable react/display-name */
import { useState, useEffect, useCallback, forwardRef, useRef } from "react";
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

const TIMELINE_PADDING = Object.freeze({
  INCREASE: 1.1, // 10%
  DECREASE: 0.9, // It's equal to 90%
});

export function MultiChannelAudio() {
  const [files, setFiles] = useState([]);
  const [mainAudioFile, setMainAudioFile] = useState();
  const [timelineWidth, setTimelineWidth] = useState();
  const [playbackIconState, setPlaybackIconState] = useState(false);

  const [mainAudioTimeInfo, setMainAudioTimeInfo] = useState({
    duration: 0,
    currentTime: 0,
  });
  const TogglePayAudio = useRef();

  const mainWavePlayerRef = useCallback((options) => {
    if (options) {
      const { duration, currentTime, TogglePlay } = options;
      setMainAudioTimeInfo({ duration, currentTime });
      TogglePayAudio.current = { TogglePlay };
    }
  }, []);

  const timelineRef = useCallback((node) => {
    if (node) {
      setTimelineWidth(node.clientWidth);
    }
  }, []);

  const saveAudioFileToState = (file) => {
    setFiles((prev) => [...prev, ...file]);
  };

  const toggleAudioPlayback = () => {
    TogglePayAudio.current.TogglePlay();
    setPlaybackIconState(!playbackIconState);
  };

  useEffect(() => {
    if (!timelineWidth) return;

    const newWidth = `calc(100% - 85ch + ${timelineWidth}px)`;
    const draggabeListElement = document.querySelector(
      'ul[data-component="wave-draggable-list"]'
    );

    draggabeListElement.style.width = newWidth;
  }, [timelineWidth]);

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

      {mainAudioFile ? (
        <>
          <strong>
            {mainAudioTimeInfo.currentTime} - {mainAudioTimeInfo.duration} -{" "}
            {timelineWidth}
          </strong>

          <FileAudio
            multiple
            onFile={saveAudioFileToState}
            rounded
            className="justify-self-end md:my-1"
          />

          <div className="relative border-[color:var(--clr-body)] border-4 rounded-md flex flex-col flex-1 py-6 my-2 w-full overflow-x-auto">
            <div className="h-[36px] z-[30] absolute top-0 bg-neutral-100 rounded flex-shrink-0">
              <TimeLine
                ref={timelineRef}
                duration={mainAudioTimeInfo.duration}
              />
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
                    duration={mainAudioTimeInfo.duration}
                  />
                </WaveDraggable>
              ))}
            </ul>

            <div
              className="bg-teal-500 absolute h-full w-[2px] z-[40] top-0 cursor-ew-resize"
              style={{
                left: `${
                  mainAudioTimeInfo.currentTime *
                  ((timelineWidth * TIMELINE_PADDING.DECREASE) /
                    mainAudioTimeInfo.duration)
                }px`,
              }}
            >
              <div className="bg-teal-500 absolute w-[12px] h-[12px] rounded-sm top-0 left-[calc(50%+1px)] -translate-x-1/2"></div>
              <div className="bg-teal-500 absolute w-[9px] h-[9px] rounded-sm rotate-45 top-[6px] left-[calc(50%+1px)] -translate-x-1/2"></div>
            </div>
          </div>

          <WavePlayer
            ref={mainWavePlayerRef}
            url={mainAudioFile?.url}
            name={mainAudioFile.name}
            interact={false}
            hasPlugins={false}
            hiddenTime
          />
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

            <button className="button">Export</button>
          </div>
        </>
      ) : (
        <FileAudio onFile={(file) => setMainAudioFile(...file)} />
      )}
    </div>
  );
}

function WavePlayerItem({ duration: totalDuration, ...props }) {
  const minPxPerSec = useCallback(() => {
    const timelineElement = document.querySelector(
      'div[data-component="timeline"]'
    );
    const widthOfTimeline = timelineElement?.clientWidth;

    return (widthOfTimeline * TIMELINE_PADDING.DECREASE) / totalDuration;
  }, [totalDuration]);

  return (
    <WavePlayer
      {...props}
      minPxPerSec={minPxPerSec()}
      interact={false}
      hasPlugins={false}
      hiddenTime
    />
  );
}

const TimeLine = forwardRef(({ duration, slider = 1 }, ref) => {
  const timeLineNumbers = Array.from(
    { length: Math.floor((duration * TIMELINE_PADDING.INCREASE) / slider) },
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

  return duration ? (
    <div
      ref={ref}
      data-component="timeline"
      className="px-[4.8px] w-full h-full items-end flex"
      style={{ gap: "16px" }}
    >
      {lines}
    </div>
  ) : null;
});

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

WavePlayerItem.propTypes = {
  duration: PropTypes.number,
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
