import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Science Live`,
    siteUrl: `https://sciencelive4all.org`,
  },
  graphqlTypegen: true,
  plugins: ["gatsby-plugin-postcss"],
};

export default config;
