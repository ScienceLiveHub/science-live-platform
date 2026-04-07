import { createContext, useContext } from "react";

interface EmbedContextValue {
  /** Whether the app is running in embed mode (inside an iframe) */
  embedded: boolean;
  /** The base URL of the main Science Live platform */
  platformUrl: string;
}

const EmbedContext = createContext<EmbedContextValue>({
  embedded: false,
  platformUrl: "",
});

export function EmbedProvider({
  children,
  platformUrl,
}: {
  children: React.ReactNode;
  platformUrl: string;
}) {
  return (
    <EmbedContext.Provider value={{ embedded: true, platformUrl }}>
      {children}
    </EmbedContext.Provider>
  );
}

export function useEmbed() {
  return useContext(EmbedContext);
}
