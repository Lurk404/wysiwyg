import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installStorageShim } from "./storage.js";
import StyledEditor from "./StyledEditor.jsx";

installStorageShim();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StyledEditor />
  </StrictMode>
);
