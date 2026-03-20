import { RelativeDateTime } from "@/components/relative-datetime";
import { Spinner } from "@/components/ui/spinner";
import { AsyncLabel } from "@/hooks/use-labels";
import { NANOPUB_COMMENTS, NANOPUB_STATUS } from "@/lib/queries";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Status information for a nanopublication.
 */
interface NanopubStatus {
  supercededBy?: string;
  retractedBy?: string;
  approvals: number;
  disapprovals: number;
  comments: number;
}

/**
 * Comment data for a nanopublication.
 */
interface NanopubComment {
  commentNp: string;
  commentText: string;
  creator?: string;
  createdDate?: string;
}

/**
 * Component displaying nanopub status information.
 * Shows retraction/superseding status and approval/disapproval counts, and comments.
 */
export function NanopubStatus({ nanopubUri }: { nanopubUri: string }) {
  const [status, setStatus] = useState<NanopubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<NanopubComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await executeBindSparql(
          NANOPUB_STATUS,
          { nanopubUri },
          NANOPUB_SPARQL_ENDPOINT_FULL,
          controller.signal,
        );
        if (results.length > 0) {
          const row = results[0];
          setStatus({
            supercededBy: row.supercededBy || undefined,
            retractedBy: row.retractedBy || undefined,
            approvals: parseInt(row.approvals, 10) || 0,
            disapprovals: parseInt(row.disapprovals, 10) || 0,
            comments: parseInt(row.comments, 10) || 0,
          });
        }
      } catch (err: any) {
        // Ignore errors from aborted requests (e.g., React Strict Mode double-calls)
        if (err?.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch nanopub status:", err);
        setError("Failed to load status");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    return () => {
      controller.abort();
    };
  }, [nanopubUri]);

  // Fetch comments when expanded
  useEffect(() => {
    const controller = new AbortController();

    const fetchComments = async () => {
      if (!showComments || !status?.comments) return;

      setIsLoadingComments(true);
      setCommentsError(null);
      try {
        const results = await executeBindSparql(
          NANOPUB_COMMENTS,
          { nanopubUri },
          NANOPUB_SPARQL_ENDPOINT_FULL,
          controller.signal,
        );
        setComments(
          results.map((row) => ({
            commentNp: row.commentNp,
            commentText: row.commentText,
            creator: row.creator || undefined,
            createdDate: row.createdDate || undefined,
          })),
        );
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        console.error("Failed to fetch comments:", err);
        setCommentsError("Failed to load comments");
      } finally {
        setIsLoadingComments(false);
      }
    };

    fetchComments();

    return () => {
      controller.abort();
    };
  }, [showComments, status?.comments, nanopubUri]);

  if (isLoading) {
    return <Spinner className="size-6" />;
  }

  if (error) {
    return <p className="text-muted-foreground text-sm">{error}</p>;
  }

  if (!status) return null;

  const isRetracted = !!status.retractedBy;
  const isSuperceded = !!status.supercededBy;
  const hasIssues = isRetracted || isSuperceded;

  return (
    <>
      {/* Retraction Status */}
      {isRetracted && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Retracted</p>
            <p className="text-sm text-muted-foreground">
              This nanopublication has been retracted.
            </p>
            {status.retractedBy && (
              <Link
                to={`/np?uri=${status.retractedBy}`}
                className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                View retraction
                <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Superseded Status */}
      {isSuperceded && (
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-600">Superseded</p>
            <p className="text-sm text-muted-foreground">
              A newer version of this nanopublication exists.
            </p>
            {status.supercededBy && (
              <Link
                to={`/np?uri=${status.supercededBy}`}
                className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                View newer version
                <ExternalLink className="size-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Valid Status */}
      {!hasIssues && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="size-5" />
          <span className="font-medium">Latest valid version</span>
        </div>
      )}

      {/* Approvals/Disapprovals/Comments */}
      <div className="flex gap-4 pt-2 border-t mt-2">
        <div className="flex items-center gap-2">
          <ThumbsUp className="size-4 text-green-600">
            <title>Approvals</title>
          </ThumbsUp>
          <span className="font-medium">{status.approvals}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThumbsDown className="size-4 text-destructive">
            <title>Disapprovals</title>
          </ThumbsDown>
          <span className="font-medium">{status.disapprovals}</span>
        </div>
        <button
          className={`flex items-center gap-2 ${status.comments > 0 ? "cursor-pointer hover:text-primary" : "cursor-default"}`}
          onClick={() => status.comments > 0 && setShowComments(!showComments)}
          disabled={status.comments === 0}
        >
          <MessageSquare className="size-4 text-blue-600" />
          <span className="font-medium">{status.comments}</span>
          <span className="text-muted-foreground text-sm">
            {status.comments === 1 ? "comment" : "comments"}
          </span>
          {status.comments > 0 &&
            (showComments ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            ))}
        </button>
      </div>

      {/* Comments List */}
      {showComments && status.comments > 0 && (
        <div className="pt-3">
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="size-5" />
            </div>
          ) : commentsError ? (
            <p className="text-sm text-muted-foreground">{commentsError}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments found.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.commentNp}
                  className="p-3 bg-muted/50 rounded-lg text-sm"
                >
                  <p className="whitespace-pre-wrap text-shadow-muted-foreground">
                    {comment.commentText}
                  </p>
                  <div className="flex flex-row items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {comment.creator && (
                      <AsyncLabel uri={comment.creator} link />
                    )}{" "}
                    •
                    {comment.createdDate && (
                      <RelativeDateTime
                        date={comment.createdDate}
                        className="text-xs"
                      />
                    )}
                    <Link
                      to={`/np?uri=${comment.commentNp}`}
                      className="text-primary hover:underline items-center gap-1"
                    >
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
