import { ThemeProvider } from "@/components/theme-provider";
import React from "react";
import "./src/styles/global.css";

export const wrapRootElement = ({ element }) => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <React.Fragment>{element}</React.Fragment>
  </ThemeProvider>
);
