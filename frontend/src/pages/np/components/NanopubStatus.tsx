import { RelativeDateTime } from "@/components/relative-datetime";
import { Spinner } from "@/components/ui/spinner";
import { AsyncLabel } from "@/hooks/use-labels";
import { loadSigningProfile, UserIdentity } from "@/lib/api-utils";
import { authClient } from "@/lib/auth-client";
import { NanopubTemplate } from "@/lib/nanopub-template";
import { NANOPUB_COMMENTS, NANOPUB_STATUS } from "@/lib/queries";
import { publishRdf } from "@/lib/rdf";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { TEMPLATE_URI } from "../create/components/templates/registry-metadata";
import { CommentEntry } from "./CommentEntry";

/**
 * Status information for a nanopublication.
 */
interface NanopubStatusData {
  supercededBy?: string;
  retractedBy?: string;
  approvals: number;
  disapprovals: number;
  comments: number;
}

/**
 * Comment data for a nanopublication.
 */
export interface NanopubComment {
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
  const [status, setStatus] = useState<NanopubStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<NanopubComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // Approval/disapproval state
  const [signingProfile, setSigningProfile] = useState<UserIdentity | null>(
    null,
  );
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isSubmittingDisapproval, setIsSubmittingDisapproval] = useState(false);

  // Get session to check if user is signed in
  const { data: session } = authClient.useSession();

  // Fetch user identity (ORCID and signing key) when signed in
  useEffect(() => {
    if (!session?.user) {
      setSigningProfile(null);
      return;
    }

    loadSigningProfile((profile: UserIdentity | null) => {
      setSigningProfile(profile);
    });
  }, [session]);

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
            commentNp: row.np,
            commentText: row.commentText,
            creator: row.creator || undefined,
            createdDate: row.date || undefined,
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

  /**
   * Handle approval or disapproval of the nanopub
   */
  const handleApproveOrDisapprove = useCallback(
    async (isApproval: boolean) => {
      if (
        !signingProfile ||
        !signingProfile.orcid ||
        !signingProfile.privateKey
      ) {
        toast.error(
          "You must be signed in and verified with an ORCID and default signing key to " +
            (isApproval ? "approve" : "disapprove"),
        );
        return;
      }

      if (isApproval) {
        setIsSubmittingApproval(true);
      } else {
        setIsSubmittingDisapproval(true);
      }

      try {
        // Load the approve/disapprove template
        const template = await NanopubTemplate.load(
          TEMPLATE_URI.APPROVE_OR_DISAPPROVE,
        );

        // Generate the signed nanopublication
        const signed = await template.generateNanopublication(
          {
            nanopub: nanopubUri,
            approveOrDisapprove: isApproval
              ? "http://purl.org/nanopub/x/approvesOf"
              : "http://purl.org/nanopub/x/disapprovesOf",
          },
          {
            orcid: signingProfile.orcid,
            name: signingProfile.name,
          },
          signingProfile.privateKey,
        );

        // Publish the nanopublication
        await publishRdf(signed.signedRdf);

        toast.success(
          `${isApproval ? "Approval" : "Disapproval"} published successfully!`,
        );

        // Update the count locally
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                [isApproval ? "approvals" : "disapprovals"]:
                  (isApproval ? prev.approvals : prev.disapprovals) + 1,
              }
            : prev,
        );
      } catch (err) {
        console.error("Failed to submit approval/disapproval:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to publish ${isApproval ? "approval" : "disapproval"}`,
        );
      } finally {
        if (isApproval) {
          setIsSubmittingApproval(false);
        } else {
          setIsSubmittingDisapproval(false);
        }
      }
    },
    [signingProfile, nanopubUri],
  );

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

  const isSubmitting = isSubmittingApproval || isSubmittingDisapproval;

  return (
    <>
      {/* Retraction Status */}
      {isRetracted && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20 m-2">
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
        <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 m-2">
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
          <span className="font-medium">Latest valid version</span>
        </div>
      )}

      {/* Approvals/Disapprovals/Comments */}
      <div className="flex gap-4 pt-2 border-t mt-2">
        {/* Approve button */}
        <button
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
          onClick={() => handleApproveOrDisapprove(true)}
          title={
            !session?.user
              ? "Sign in to approve"
              : !signingProfile
                ? "Configure signing key to approve"
                : "Click to approve this nanopub"
          }
        >
          {isSubmittingApproval ? (
            <Spinner className="size-4" />
          ) : (
            <ThumbsUp className="size-4 text-green-600 hover:text-green-700">
              <title>Approve</title>
            </ThumbsUp>
          )}
          <span className="font-medium">{status.approvals}</span>
        </button>

        {/* Disapprove button */}
        <button
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
          onClick={() => handleApproveOrDisapprove(false)}
          title={
            !session?.user
              ? "Sign in to disapprove"
              : !signingProfile
                ? "Configure signing key to disapprove"
                : "Click to disapprove this nanopub"
          }
        >
          {isSubmittingDisapproval ? (
            <Spinner className="size-4" />
          ) : (
            <ThumbsDown className="size-4 text-destructive hover:text-red-700">
              <title>Disapprove</title>
            </ThumbsDown>
          )}
          <span className="font-medium">{status.disapprovals}</span>
        </button>

        {/* Comments toggle */}
        <button
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageSquare className="size-4 text-blue-600" />
          <span className="font-medium">{status.comments}</span>
          <span className="text-muted-foreground text-sm">
            {status.comments === 1 ? "comment" : "comments"}
          </span>
          {showComments ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pt-3 space-y-4">
          <CommentEntry
            existingComments={comments}
            nanopubUri={nanopubUri}
            onComment={(newComments) => {
              if (newComments) {
                // Increment comment count (avoiding a refetch) and refresh comments list
                setStatus((prev) =>
                  prev ? { ...prev, comments: newComments.length } : prev,
                );

                setComments(newComments);
              }
            }}
          />

          {/* Comments List */}
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
