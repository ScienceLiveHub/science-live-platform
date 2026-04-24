import { NanopubIcon } from "@/components/nanopub-icon";
import { NavLink } from "react-router-dom";

/**
 * Viewer Demo
 *
 * - Some simple Demo links
 */

export default function ViewerDemo() {
  return (
    <div className="mt-10 mb-4 gap-2 w-full md:w-auto">
      <span className="text-sm text-muted-foreground">Examples:</span>
      <ul className="mt-2 space-y-2">
        <li className="flex items-start gap-2">
          <NanopubIcon className="h-4 w-4 mt-1 text-link" />
          <NavLink
            to={
              "/np/?uri=https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc"
            }
            className="text-link hover:underline"
          >
            Quoting or commenting on a paper
          </NavLink>
        </li>
        <li className="flex items-start gap-2">
          <NanopubIcon className="h-4 w-4 mt-1 text-link" />
          <NavLink
            to="/np/?uri=https://w3id.org/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield"
            className="text-link hover:underline"
          >
            Defining a subject: Garfield
          </NavLink>
        </li>
        <li className="flex items-start gap-2">
          <NanopubIcon className="h-4 w-4 mt-1 text-link" />
          <NavLink
            to="/np/?uri=https://w3id.org/np/RAZMzeEoutrEi1xEpf5XSrSpMnvwTONYzMat5TkIqUWY8"
            className="text-link hover:underline"
          >
            Stating a fact about a subject: Garfield is a fictional character
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
