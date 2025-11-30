import { useParams } from "react-router-dom";
import { useEffect } from "react";
import "@nanopub/display";

export default function ViewRaw() {
  const params = useParams();

  useEffect(() => {}, [params]);
  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6 md:max-w-300">
      <nanopub-display url={"https://w3id.org/np/" + params.nanopubId} />
    </main>
  );
}
