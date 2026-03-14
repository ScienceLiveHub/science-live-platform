import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Science Live`,
    siteUrl: `https://sciencelive4all.org`,
    platformUrl: process.env.GATSBY_PLATFORM_URL || "http://localhost:3000",
  },
  graphqlTypegen: true,
  plugins: ["gatsby-plugin-postcss"],
};

export default config;
