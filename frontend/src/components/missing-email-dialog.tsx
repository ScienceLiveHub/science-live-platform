import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isValidEmail } from "../../../api/src/utils";

export function MissingEmailDialog() {
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Check if user is logged in and has a placeholder ORCID email or no email
    // TODO: we could also use this to force the user to verify their email in normal login accounts too
    if (session?.user && !isValidEmail(session.user.email)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [session]);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail: email,
        callbackURL: "/email-verified",
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Verification email sent!");
        setEmailSent(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending the verification email.");
    } finally {
      setLoading(false);
    }
  };

  // Prevent closing by returning the current state if user tries to close
  const handleOpenChange = (open: boolean) => {
    if (!open && session?.user?.email?.endsWith("@orcid")) {
      // Do not allow closing if condition is met
      return;
    }
    setIsOpen(open);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-110"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Update your email</DialogTitle>
          <DialogDescription>
            {emailSent
              ? "We've sent a verification link to your new email address. Please check your inbox and click the link to verify your account."
              : "Your account was created via ORCID, which does not provide an email address. Please enter the same primary email address used for your ORCID account to complete your registration."}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Verification Link"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              I've verified my email
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
