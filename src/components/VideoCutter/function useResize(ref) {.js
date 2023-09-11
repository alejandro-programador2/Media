function useResize(ref) {
  const [isResizing, setisResizing] = useState(false);
  const [styles, setStyles] = useState({ right: "96.2102%", left: "0%" });

  const resizeOptions = useRef({});

  const isValidElement = (element) =>
    typeof element === "string" ||
    typeof element === "undefined" ||
    typeof element !== "object";

  const validateResizeSideData = useCallback(() => {
    if (
      !ref.current.querySelector('[data-resize-side="left"]') ||
      !ref.current.querySelector('[data-resize-side="right"]')
    ) {
      throw new Error(
        'You need to put the "data-resize-side" prop in someone element.'
      );
    }
  }, [ref]);

  useEffect(() => {
    if (isValidElement(ref) || validateResizeSideData() instanceof Error)
      return;

    const { current: element } = ref;

    const onPointerMove = ({ clientX }) => {
      if (!isResizing) return;
      console.log("onPointerMove", isResizing);

      setStyles((prevStyles) => {
        const { start, right, left, handle } = resizeOptions.current;

        const deltaX = clientX - start;
        const deltaSeconds = (deltaX / 1103) * 270.512472;

        const newRight = handle === 'right'? right + deltaSeconds : right
        const newLeft = handle === 'left' ? left + deltaSeconds : left 

        // let newRight = `${right + deltaX}%`;
        // if (handle === "left") {
        //   return {
        //     ...prevStyles,
        //     left: `${left + deltaX}px`,
        //   };
        // }

        return {
          ...prevStyles,
          right: `${(270.512472 - newRight) / 270.512472 * 100}%`,
          left: `${(newLeft / 270.512472) * 100}px`
        };
      });
    };

    const onPointerDown = (event) => {
      if (!event.srcElement.dataset?.resizeSide) return;
      console.log("onPointerDown", isResizing);

      resizeOptions.current = {
        start: event.clientX,
        right: parseInt(styles.right),
        left: parseInt(styles.left),
        handle: event.srcElement.dataset.resizeSide,
      };

      setisResizing(true);
    };

    const onPointerUp = () => {
      if (isResizing) {
        console.log("onPointerUp", isResizing);
        setisResizing(!isResizing);
      }
    };

    // Agregar escuchadores de eventos
    element.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);

    return () => {
      element.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseup", onPointerUp);
    };
  }, [ref, isResizing, validateResizeSideData, styles.width]);

  return {
    styles,
  };
}