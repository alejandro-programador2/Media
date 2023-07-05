/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/display-name */
import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";

import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import converterTime from "../../helper/converterTime";

import css from "./WavePlayer.module.css";

export const WavePlayer = forwardRef(({ id, url, onRegionTime }, ref) => {
  const playerRef = useRef();
  const { wavesurfer, time, regionTime } = useWaveSurfer(playerRef, url);

  const TogglePlay = useCallback(() => {
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
  }, [wavesurfer]);

  useImperativeHandle(
    ref,
    () => {
      return {
        id,
        TogglePlay,
      };
    },
    []
  );

  useEffect(() => {
    if (onRegionTime) {
      onRegionTime(regionTime);
    }
  }, [regionTime]);

  return (
    <button id={id} className="border-2 w-full">
      <small className="block text-left">
        {converterTime(time.currentTime)} - {converterTime(time.duration)}
      </small>
      <div
        ref={playerRef}
        className={`${css.waveplayer} border-4 border-[color:var(--clr-body)] rounded-md px-2`}
      />
    </button>
  );
});

WavePlayer.propTypes = {
  id: PropTypes.string,
  url: PropTypes.string,
  onRegionTime: PropTypes.func,
};
