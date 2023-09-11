import { useId } from "react";
import PropTypes from "prop-types";
import css from "./FileAudio.module.css";

export function FileAudio({ multiple, onFile, label, rounded, className, accept }) {
  const inputId = useId();

  const handleChange = async ({ target }) => {
    const files = Promise.all(
      Array.from(target.files, async (file) => {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);

        await new Promise((resolve) => {
          audio.onloadedmetadata = resolve;
        });

        return {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.mp3$/, ""),
          url,
          duration: audio.duration,
          file,
        };
      })
    );

    if (onFile) {
      onFile([...(await files)]);
    }
  };

  return (
    <div className={css["content"]}>
      <label
        htmlFor={inputId}
        className={`button ${
          rounded && "button--rounded"
        } button--icon my-1 md:my-3 ${className ?? ""}`}
      >
        <span className={`${rounded && "sr-only"}`}> {label} </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="48"
          viewBox="0 -960 960 960"
          width="48"
        >
          <path d="M220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Zm230-153v-371L330-564l-43-43 193-193 193 193-43 43-120-120v371h-60Z" />
        </svg>
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        required
        onChange={handleChange}
        className="sr-only"
        {...(multiple && { multiple })}
      />
    </div>
  );
}

FileAudio.defaultProps = {
  label: "Put your audio file here",
  accept: "audio/*"
};

FileAudio.propTypes = {
  multiple: PropTypes.bool,
  onFile: PropTypes.func,
  label: PropTypes.string,
  rounded: PropTypes.bool,
  className: PropTypes.string,
  accept: PropTypes.string
};
