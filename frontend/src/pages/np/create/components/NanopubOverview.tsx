import { Badge } from "@/components/ui/badge";
import { useLabels } from "@/hooks/use-labels";
import { COMMON_LICENSES } from "@/lib/nanopub-store";
import { formatDate } from "@/lib/string-format";
import { extractOrcidId, getNanopubHash } from "@/lib/uri";
import { BadgeCheck, LayersPlus, NotepadTextDashed, User } from "lucide-react";
import { Link } from "react-router-dom";
import { NanopubViewerProps, ShareMenu } from "./NanopubViewer";

export function NanopubOverview({
  store,
  creatorUserIdsByOrcid = {},
  showShareMenu = true,
}: NanopubViewerProps) {
  const { getLabel } = useLabels(store.labelCache);

  return (
    <>
      {/* Overview */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div className="relative mb-6">
          <div className="pr-16">
            <h2 className=" text-2xl md:text-3xl font-bold flex">
              {store.metadata.title ??
                `${getNanopubHash(store.metadata.uri!)?.substring(0, 10)}...`}{" "}
              {/* TODO: this should actually check for trustworthiness somehow */}
              <BadgeCheck
                className="m-1.5"
                color="#33aa33"
                strokeWidth={2}
                fill="#33dd3333"
              >
                <title>This nanopub is trustworthy</title>
              </BadgeCheck>
              {store.metadata.types?.some(
                (t) => t.href === "http://purl.org/nanopub/x/ExampleNanopub",
              ) && (
                <NotepadTextDashed
                  className="m-1.5"
                  color="#999999"
                  strokeWidth={2}
                >
                  <title>This is a DRAFT nanopub</title>
                </NotepadTextDashed>
              )}
              {store.metadata.types?.some(
                (t) => t.href === "http://purl.org/nanopub/x/introduces",
              ) && (
                <LayersPlus className="m-1.5" color="#aaaa00" strokeWidth={2}>
                  <title>This nanopub introduces something</title>
                </LayersPlus>
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
              <span className="text-muted-foreground">—</span>
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
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="mt-1 text-sm space-y-1">
          <div>
            <span className="font-bold">Type:</span>{" "}
            {store.metadata.types?.length ? (
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
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

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
