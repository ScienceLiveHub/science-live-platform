import { Badge } from "@/components/ui/badge";
import { useLabels } from "@/hooks/use-labels";
import { COMMON_LICENSES } from "@/lib/nanopub-store";
import { formatDate } from "@/lib/string-format";
import { extractOrcidId, getNanopubHash, toScienceLiveNPUri } from "@/lib/uri";
import {
  BadgeCheck,
  FilePlus,
  LayersPlus,
  NotepadTextDashed,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { NanopubViewerProps, ShareMenu } from "./NanopubViewer";
import { TEMPLATE_METADATA } from "./templates/registry-metadata";

export function NanopubOverview({
  store,
  creatorUserIdsByOrcid = {},
  showShareMenu = true,
}: NanopubViewerProps) {
  const { getLabel } = useLabels(store.labelCache);
  const isExample = store.metadata.types?.some(
    (t) => t.href === "http://purl.org/nanopub/x/ExampleNanopub",
  );
  const isTemplate = store.metadata.types?.some(
    (t) => t.href === "https://w3id.org/np/o/ntemplate/AssertionTemplate",
  );
  return (
    <>
      {/* Overview */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div className="relative mb-6">
          <div className="pr-16">
            <h2 className=" text-2xl md:text-3xl font-bold flex">
              {/* TODO: peform this during store.metadata generation and store in metadata.title? */}
              {store.metadata.title ||
                store.metadata.introduces?.[0]?.label ||
                (store.metadata.introduces?.[0]?.uri &&
                  store.findInternalLabel(
                    store.metadata.introduces?.[0]?.uri,
                  )) ||
                `${getNanopubHash(store.metadata.uri!)?.substring(0, 10)}...`}{" "}
              {/* TODO: this should actually check for trustworthiness somehow */}
              {!isExample && (
                <BadgeCheck
                  className="m-1.5"
                  color="#33aa33"
                  strokeWidth={2}
                  fill="#33dd3333"
                >
                  <title>This nanopub is trustworthy</title>
                </BadgeCheck>
              )}
              {isExample && (
                <NotepadTextDashed
                  className="m-1.5"
                  color="#999999"
                  strokeWidth={2}
                >
                  <title>
                    This is an EXAMPLE nanopub, for demo purposes and not to be
                    taken seriously
                  </title>
                </NotepadTextDashed>
              )}
              {!!store.metadata.introduces?.length && (
                <LayersPlus className="m-1.5" color="#aaaa00" strokeWidth={2}>
                  <title>This nanopub introduces something</title>
                </LayersPlus>
              )}
              {isTemplate && (
                <Link to={`/np/create?template=${store.metadata.uri}`}>
                  {" "}
                  <FilePlus className="m-1.5" color="#9999ff" strokeWidth={2}>
                    <title>
                      This is a template, click to create a new nanopub using
                      this template
                    </title>
                  </FilePlus>
                </Link>
              )}
            </h2>
          </div>

          <div>
            <span>By</span>{" "}
            {store.metadata.creators?.length ? (
              <span className="space-x-2">
                {store.metadata.creators.map((c) => {
                  const orcidId = extractOrcidId(c.href ?? "");
                  const scienceLiveUserId = orcidId
                    ? creatorUserIdsByOrcid[orcidId]?.id
                    : null;

                  return (
                    <span
                      key={`${c.name}-${c.href ?? ""}`}
                      className="inline-flex items-center gap-1"
                    >
                      <a
                        className="text-purple-600 dark:text-purple-400 hover:underline break-all"
                        href={c.href?.startsWith("http") ? c.href : undefined}
                        target={
                          c.href?.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          c.href?.startsWith("http") ? "noreferrer" : undefined
                        }
                      >
                        {c.name ?? (c.href ? getLabel(c.href) : "user")}
                      </a>
                      {scienceLiveUserId ? (
                        <Link
                          to={`/user/${scienceLiveUserId}`}
                          className="text-muted-foreground hover:text-foreground"
                          title="View Science Live profile"
                        >
                          <User className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>

          {showShareMenu && store.metadata.uri ? (
            <div className="absolute right-0 top-0">
              <ShareMenu uri={store.metadata.uri} />
            </div>
          ) : null}
          <div className="text-sm">
            <span className="">Published </span>{" "}
            {store.metadata.created ? (
              formatDate(store.metadata.created)
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
          <div>
            {!!store.metadata.types?.length && (
              <span className="space-x-2">
                {store.metadata.types.map((c) => (
                  <a
                    key={c.name}
                    className="text-blue-600 hover:underline break-all"
                    href={c.href?.startsWith("http") ? c.href : undefined}
                    target={c.href?.startsWith("http") ? "_blank" : undefined}
                    rel={c.href?.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <Badge variant="secondary" className="gap-1">
                      {c.name}
                    </Badge>
                  </a>
                ))}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 text-sm space-y-1">
          {!!store.metadata.introduces?.length && (
            <div>
              <span className="font-bold">Introduces:</span>{" "}
              <span className="space-x-2">
                {store.metadata.introduces.map((c) => (
                  <a
                    key={c.uri}
                    className="font-mono border-2 p-0.5 px-1.5 rounded-sm font-bold text-sm text-blue-600 dark:text-blue-300 hover:underline"
                    href={toScienceLiveNPUri(c.uri!) || c.uri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {decodeURI(store.findInternalLabel(c.uri!) || "")}
                  </a>
                ))}
              </span>
            </div>
          )}
          {store.metadata.template && (
            <div>
              <span className="font-bold">From Template:</span>{" "}
              <a href={toScienceLiveNPUri(store.metadata.template)}>
                {TEMPLATE_METADATA[store.metadata.template]?.name ||
                  getLabel(store.metadata.template)}
              </a>
            </div>
          )}

          <div>
            <span className="font-bold">License:</span>{" "}
            <a href={store.metadata.license}>
              {store.metadata.license
                ? COMMON_LICENSES[store.metadata.license] ||
                  store.metadata.license
                : "-"}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
