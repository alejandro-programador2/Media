import { Link } from "react-router-dom";
import css from "./Header.module.css";

export function Header() {
  return (
    <header>
      <div className={`${css.header} wrapper`}>
        <Link to="/" className={`${css.header__logo}`}>
          Media
        </Link>

        <nav className={`${css.nav} ${css["font-small"]}`} aria-label="Main">
          <ul>
            <li>
              <Link to="cut-audio">Cut Audio</Link>
            </li>
            <li>
              <Link to="join-audio">Join Audio</Link>
            </li>
            <li>
              <Link to="multi-channel">Multi-channel</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
