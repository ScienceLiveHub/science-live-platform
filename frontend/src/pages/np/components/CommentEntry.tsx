import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { loadSigningProfile, UserIdentity } from "@/lib/api-utils";
import { authClient } from "@/lib/auth-client";
import { NanopubTemplate } from "@/lib/nanopub-template";
import { NANOPUB_COMMENTS } from "@/lib/queries";
import { publishRdf } from "@/lib/rdf";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { TEMPLATE_URI } from "../create/components/templates/registry-metadata";
import { NanopubComment } from "./NanopubStatus";

/**
 * Component for entering and publishing a comment on a nanopub, using signed in users profile.
 */
export function CommentEntry({
  nanopubUri,
  existingComments,
  onComment,
}: {
  nanopubUri: string;
  existingComments: NanopubComment[] | undefined;
  onComment: (updatedComments: NanopubComment[] | undefined) => void;
}) {
  // Comment submission state
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [signingProfile, setSigningProfile] = useState<UserIdentity | null>(
    null,
  );
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);

  // Get session to check if user is signed in
  const { data: session } = authClient.useSession();
  const location = useLocation();

  // Fetch user identity (ORCID and signing key) when signed in
  useEffect(() => {
    if (!session?.user) {
      setSigningProfile(null);
      setIsLoadingIdentity(false);
      return;
    }

    loadSigningProfile((profile) => {
      setSigningProfile(profile);
      setIsLoadingIdentity(false);
    });
  }, [session]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    if (!signingProfile) {
      toast.error(
        "You must be signed in with an ORCID and signing key to comment",
      );
      return;
    }

    setIsSubmittingComment(true);
    try {
      // Load the comment template
      const template = await NanopubTemplate.load(TEMPLATE_URI.COMMENT);

      // Generate the signed nanopublication
      const signed = await template.generateNanopublication(
        {
          thing: nanopubUri, // The nanopub being commented on
          comment: newComment.trim(),
        },
        {
          orcid: signingProfile.orcid,
          name: signingProfile.name,
        },
        signingProfile.privateKey,
      );

      // Publish the nanopublication
      await publishRdf(signed.signedRdf);

      toast.success("Comment published successfully!");

      // Re-fetch comments to show the new one
      // The nanopublication may take a few seconds to be published, so retry if needed
      const previousCount = existingComments?.length || 0;
      const maxRetries = 3;
      const retryDelayMs = 2000;

      const fetchCommentsWithRetry = async (): Promise<
        NanopubComment[] | undefined
      > => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const results = await executeBindSparql(
            NANOPUB_COMMENTS,
            { nanopubUri },
            NANOPUB_SPARQL_ENDPOINT_FULL,
            undefined, // No abort signal for this immediate follow-up
          );

          const fetchedComments = results.map((row) => ({
            commentNp: row.np,
            commentText: row.commentText,
            creator: row.creator || undefined,
            createdDate: row.date || undefined,
          }));

          // If we got more comments than before, return them
          if (fetchedComments.length > previousCount) {
            return fetchedComments;
          }

          // If this wasn't the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
        }

        // Return whatever we had after all retries
        return existingComments;
      };

      const newComments = await fetchCommentsWithRetry();

      // Clear the input and callback parent to handle change in comments
      setNewComment("");

      onComment(newComments);
    } catch (err) {
      console.error("Failed to submit comment:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to publish comment",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newComment, signingProfile, nanopubUri, existingComments, onComment]);

  return (
    <>
      {/* Comment Input for signed-in users */}
      {session?.user && !isLoadingIdentity && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Add a comment</label>
          {signingProfile ? (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isSubmittingComment}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500 characters
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? (
                    <>
                      <Spinner className="size-4 mr-2" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Publish Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need an ORCID linked and a signing key configured to publish
              comments.
              <Link
                to="/settings/signing-keys"
                className="text-primary hover:underline ml-1"
              >
                Configure signing keys
              </Link>
            </p>
          )}
        </div>
      )}

      {/* TODO: we should also try to show similar status info if anything critical for signing
       is missing from signingProfile, similarly to the NanopubEditor. Consider creating a shared
       component for this */}

      {/* Loading indicator for identity */}
      {session?.user && isLoadingIdentity && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-4" />
          <span className="text-sm">Loading your profile...</span>
        </div>
      )}
      {/* Sign in prompt */}
      {!session?.user && (
        <p className="text-sm text-muted-foreground">
          <Link
            to={`/auth/sign-in?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
            className="text-primary hover:underline"
          >
            Sign in
          </Link>{" "}
          to add a comment.
        </p>
      )}
    </>
  );
}
