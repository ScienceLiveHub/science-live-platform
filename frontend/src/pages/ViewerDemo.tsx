import { FileCode } from "lucide-react";
import { NavLink } from "react-router-dom";

/**
 * Viewer Demo
 *
 * - Some simple Demo links
 */

export default function ViewerDemo() {
  return (
    <div className="mt-10 mb-4 gap-2 w-full md:w-auto">
      Some examples:
      <ul className="mt-2 space-y-2">
        <li className="flex items-start gap-2">
          <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
          <NavLink
            to={
              "/np/?uri=https://w3id.org/np/RA6Cz33icPZrBAummwxw6MwdS-RepX-sUjW_fZz905Rvc"
            }
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Quoting or commenting on a paper
          </NavLink>
        </li>
        <li className="flex items-start gap-2">
          <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
          <NavLink
            to="/np/?uri=https://w3id.org/np/RAuoXvJWbbzZsFslswYaajgjeEl-040X6SCQFXHfVtjf0#Garfield"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Defining a subject: Garfield
          </NavLink>
        </li>
        <li className="flex items-start gap-2">
          <FileCode className="h-4 w-4 mt-1 text-purple-600 dark:text-purple-400" />
          <NavLink
            to="/np/?uri=https://w3id.org/np/RAZMzeEoutrEi1xEpf5XSrSpMnvwTONYzMat5TkIqUWY8"
            className="text-purple-600 dark:text-purple-400 hover:underline"
          >
            Stating a fact about a subject: Garfield is a fictional character
          </NavLink>
        </li>
      </ul>
    </div>
  );
}
