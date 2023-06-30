/* eslint-disable react/display-name */
import { useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import PropTypes from "prop-types";

import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import converterTime from "../../helper/converterTime";

import css from "./WavePlayer.module.css";

export const WavePlayer = forwardRef(({ url, onRegionTime }, ref) => {
  const playerRef = useRef();
  const { wavesurfer, time, regionTime } = useWaveSurfer(playerRef, url);

  const TogglePlay = () => {
    wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play();
  };

  useImperativeHandle(ref, () => {
    return {
      TogglePlay,
    };
  });

  useEffect(() => {

    if (onRegionTime) {
      onRegionTime(regionTime);
    }
  }, [onRegionTime, regionTime]);

  return (
    <div>
      <small className="block text-left">
        {converterTime(time.currentTime)} - {converterTime(time.duration)}
      </small>
      <div
        ref={playerRef}
        className={`${css.waveplayer} border-4 border-[color:var(--clr-body)] rounded-md px-2`}
      />
    </div>
  );
});

WavePlayer.propTypes = {
  url: PropTypes.string,
  onRegionTime: PropTypes.func,
};
