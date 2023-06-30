import PropTypes from "prop-types";
import css from "./Shell.module.css";

export function Shell({ children, className, ...props }) {
  return <section className={`${css.section} wrapper ${className ?? ""}`} {...props}>{children}</section>;
}

Shell.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  className: PropTypes.string
};
