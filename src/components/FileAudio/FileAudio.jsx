import { useId } from "react";
import PropTypes from "prop-types";
import css from "./FileAudio.module.css";

export function FileAudio({ multiple, onFile, label, isLabelVisible }) {
  const inputId = useId();

  const handleChange = ({ target }) => {
    const files = Array.from(target.files, (file) => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.mp3$/, ""),
      url: URL.createObjectURL(file),
      file,
    }));

    if (onFile) {
      onFile([...files]);
    }
  };

  return (
    <div className={css["content"]}>
      <label htmlFor={inputId} className="button button--icon my-1 md:my-4">
        <span className={`${!isLabelVisible && "sr-only"}`}> {label} </span>

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
        accept="audio/*"
        required
        onChange={handleChange}
        {...(multiple && { multiple })}
      />
    </div>
  );
}

FileAudio.defaultProps = {
  label: "Put your audio file here",
  isLabelVisible: true
};

FileAudio.propTypes = {
  multiple: PropTypes.bool,
  onFile: PropTypes.func,
  label: PropTypes.string,
  isLabelVisible: PropTypes.bool,
};
