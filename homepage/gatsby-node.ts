import type { GatsbyNode } from "gatsby";
import path from "path";

export const onCreateWebpackConfig: GatsbyNode["onCreateWebpackConfig"] = ({
  stage,
  actions,
  plugins,
}) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        // Point @/ to the frontend's src/ so shared UI components,
        // lib/utils, and other shared code are resolved from there.
        "@": path.resolve(__dirname, "../frontend/src"),
      },
    },
    plugins: [
      // Provide React globally so ESM libraries (lucide-react, etc.)
      // that use JSX without importing React work during SSR.
      plugins.provide({ React: "react" }),
    ],
  });
};
