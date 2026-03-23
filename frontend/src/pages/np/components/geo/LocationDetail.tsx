import { NanopubIcon } from "@/components/nanopub-icon";
import { AsyncLabel } from "@/hooks/use-labels";
import { ExternalLink, MapPin, MessageCircle, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import type { GeoLocation } from "./types";

/**
 * Detail panel for a selected geographic location.
 *
 * Renders location label, paper link, quotation, comment, and creator
 * in a compact card-like layout.
 */
export function LocationDetail({ location }: { location: GeoLocation }) {
  return (
    <div className="border-l-4 border-l-teal-500 bg-muted/30 rounded-r-md p-4 space-y-3">
      <h4 className="flex items-center gap-2 font-semibold">
        <MapPin className="h-4 w-4 text-teal-600" />
        {location.locationLabel}
        <Link to={`/np/?uri=${location.np}`} target="_blank">
          <NanopubIcon className="h-3 w-3" />
        </Link>
      </h4>
      {location.paper && (
        <div>
          <a
            href={location.paper}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
          >
            <AsyncLabel uri={location.paper} />
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}
      {location.quotation && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            <Quote className="h-3 w-3 inline-block mr-1" />
            Quotation
          </p>
          <blockquote className="border-l-2 border-teal-300 bg-teal-50 dark:bg-teal-950/20 pl-3 py-1 text-sm italic text-foreground/80 rounded-r-md">
            {location.quotation}
            {location.quotationEnd && (
              <>
                {" … "}
                {location.quotationEnd}
              </>
            )}
          </blockquote>
        </div>
      )}

      {location.comment && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            <MessageCircle className="h-3 w-3 inline-block mr-1" />
            Comment
          </p>
          <p className="text-sm text-foreground/80">{location.comment}</p>
        </div>
      )}
      {/* Creator */}
      {location.creator && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            By{" "}
            <a
              href={location.creator}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all text-sm"
            >
              <AsyncLabel uri={location.creator} />
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
