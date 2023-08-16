 const handleFrameCapture = () => {
    // const videoElement = videoRef.current.getInternalPlayer();
    const videoElement = videoRef.current;
    console.log(
      "🚀 ~ file: CutVideo.jsx:16 ~ handleFrameCapture ~ videoElement:",
      videoElement
    );
    const canvasElement = canvasRef.current;
    const canvasContext = canvasElement.getContext("2d");

    canvasContext.drawImage(
      videoElement,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    const frameDataUrl = canvasElement.toDataURL();
    setFrames((prevFrames) => [...prevFrames, frameDataUrl]);
  };


  const drawFrame = async (video, ctx, width, height,) => {
   

  }

  const ArrayFrames =  Promise.all(
    Array.from({ length: Math.floor(durationInSeconds * frameRate) }, async (_, i) => {
      const timeInSeconds = i / frameRate
      const image = await drawFrame(
              video,
              canvas,
              ctx,
              canvas.width,
              canvas.height,
              timeInSeconds
            );
            return image
    })
  );


  const promise = new Promise((resolve) => {
    const onTimeUpdateHandler = () => {
      ctx.drawImage(video, 0, 0, width, height);
      console.log(video.currentTime)
      // const frameDataUrl = canvas.toDataURL();
      resolve(video.currentTime);

      video.removeEventListener("timeupdate", onTimeUpdateHandler);
    };
    video.addEventListener("timeupdate", onTimeUpdateHandler);
  });

  const onTimeUpdateHandler = () => {
    ctx.drawImage(video, 0, 0, width, height);
    const frameDataUrl = canvas.toDataURL();
    // resolve(video.currentTime);

    video.removeEventListener("timeupdate", onTimeUpdateHandler);
  };

  await video.addEventListener("timeupdate", onTimeUpdateHandler);
  video.currentTime = timeInSeconds;

  return video.currentTime;

  const frameDataUrl =  new Promise((resolve) => {
    video.ontimeupdate = () => {
      ctx.drawImage(video, 0, 0, width, height);
    };
    resolve(canvas.toDataURL());
  });
  
  video.currentTime = timeInSeconds;

  return  frameDataUrl;



  // Right 🤔
  const drawFrame = (video, canvas, ctx, width, height, timeInSeconds) => {
    return new Promise((resolve) => {
      const onTimeUpdateHandler = () => {
        ctx.drawImage(video, 0, 0, width, height);
        video.removeEventListener("timeupdate", onTimeUpdateHandler);
        resolve(canvas.toDataURL());
      };

      video.addEventListener("timeupdate", onTimeUpdateHandler);
      video.currentTime = timeInSeconds;
    });
  };