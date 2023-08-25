
function useVideo({ videosId }) {
  const videosRef = useRef([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentVideo = useRef(0);

  const setNewRefVideo = (element) => {
    const videoElementIndex = videosRef.current.findIndex(
      (ref) => ref.id === element.id
    );

    if (videoElementIndex >= 0) return;
    videosRef.current.push(element);
  };

  const videoElements = (list) => {
    list.forEach((id) => {
      const element = document.querySelector(`video[id="${id}"]`);
      setNewRefVideo(element);
    });
  };

  const onPause = () => {
    if (isPlaying) {
      videosRef.current[currentVideo.current].pause();
      setIsPlaying(!isPlaying);
    }
  };

  const onPlay = () => {
    videosRef.current[currentVideo.current].play();
    setIsPlaying(!isPlaying);
  };

  const onSeek = (seconds) => {
    videosRef.current[currentVideo.current].currentTime += seconds;
  };

  // const getTracksIntoTimeline = (list) => {
  //   const trackElementPosition = list.map((id) => {
  //     const trackElement = document.querySelector(`div[data-element="drag"][id="${id}"]`);
  //     const { x } = trackElement.getBoundingClientRect()
  //     return { id, positionX: x}
  //   });

  // }
  // useEffect(() => {
  //   if (isPlaying) {
  //     ref.addEventListener("timeupdate", getCurrentTime);
  //   }

  //   return () => {
  //     ref?.removeEventListener("timeupdate", getCurrentTime);
  //   };
  // }, [isPlaying]);

  useLayoutEffect(() => {
    if (videosId.length > 0) {
      videoElements(videosId);
    }
  }, [videosId]);

  return {
    isPlaying,
    onPause,
    onPlay,
    onSeek,
  };
}