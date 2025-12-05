import "@nanopub/display";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * ViewRaw
 *
 * - View a nanopub using nanopub/display library, in a simple and "raw" way
 *
 * Intended for simple and literal viewing of nanopub data.
 * TODO: Implement the new nanopub/display library when available
 */

export default function ViewRaw() {
  const params = useParams();

  useEffect(() => {}, [params]);
  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6 md:max-w-300">
      <nanopub-display url={"https://w3id.org/np/" + params.nanopubId} />
    </main>
  );
}
