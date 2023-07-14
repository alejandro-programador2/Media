import { useEffect, useState } from "react"
import WaveSurfer from "https://unpkg.com/wavesurfer.js@beta";

export const useWaveSurfer = (element, props) => {
    const [wavesurfer, setWaveSurfer] = useState(null)
    const [time, setTime] = useState({
        duration: 0,
        currentTime: 0
    })

    useEffect(() => {
        if (!element.current) return;

        const wave = WaveSurfer.create({
            container: element.current,
            waveColor: "rgb(53, 50, 62)",
            progressColor: "rgb(171, 171, 171)",
            barWidth: "3",
            barGap: "2",
            barRadius: "2",
            normalize: true,
            responsive: true,
            hideScrollbar: true,
            height: 50, // temporal height
            fillParent: true,
            ...props,
        });

        setWaveSurfer(wave);

        return () => {
            wave.destroy();
        };
    }, [element]);

    useEffect(() => {
        if (!wavesurfer) return;

        setTime((prev) => ({ ...prev, currentTime: 0 }));

        // Events
        wavesurfer.on("ready", () => {
            const duration = wavesurfer.getDuration();
            setTime(prev => ({ ...prev, duration }))
        });

        wavesurfer.on("timeupdate", (currentTime) => {
            setTime(prev => ({ ...prev, currentTime }))
        });

        return () => {
            wavesurfer.unAll();
        };
    }, [wavesurfer]);


    return {
        wavesurfer,
        time
    }
}