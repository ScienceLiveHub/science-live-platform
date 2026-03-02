import { RelativeDateTime } from "@/components/relative-datetime";
import SettingsLayout from "@/components/settings-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsCard } from "@daveyplate/better-auth-ui";
import ky from "ky";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileKey,
  Loader2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

// Define Key type based on API response
interface SigningKey {
  id: string;
  name: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface SigningKeyDetail extends SigningKey {
  privateKey: string;
}

const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
});

const fetcher = async <T,>(url: string): Promise<T> => {
  return await api.get(url.replace(/^\//, "")).json();
};

export default function SigningKeysSettings() {
  const {
    data,
    error,
    mutate,
    isLoading: isKeysLoading,
  } = useSWR<{ keys: SigningKey[] }>("/signing/key/list", fetcher);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newPrivateKey, setNewPrivateKey] = useState("");
  const [isDefaultNew, setIsDefaultNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateKey, setGenerateKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewPrivateKey(event.target.result as string);
        toast.success("Private key loaded from file");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
    // Reset input value so the same file can be selected again if needed
    e.target.value = "";
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateKey && !newPrivateKey) {
      toast.error("Private key is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await api
        .post("signing/key", {
          json: {
            name: newKeyName,
            privateKey: generateKey ? null : newPrivateKey,
            generateKey: generateKey,
            isDefault: isDefaultNew,
          },
        })
        .json();

      toast.success("Signing key added successfully");
      setIsAddDialogOpen(false);
      setNewKeyName("");
      setNewPrivateKey("");
      setIsDefaultNew(false);
      setGenerateKey(false);
      mutate();
    } catch (err: any) {
      const errorData = await err.response?.json().catch(() => ({}));
      toast.error(errorData?.error || err.message || "Failed to add key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await api.delete(`signing/key/${id}`).json();

      toast.success("Signing key deleted");
      mutate();
    } catch (err: any) {
      const errorData = await err.response?.json().catch(() => ({}));
      toast.error(errorData?.error || err.message || "Failed to delete key");
    }
  };

  const handleSetDefault = async (key: SigningKey) => {
    if (key.isDefault) return;

    try {
      // Optimistic update
      mutate(
        data
          ? {
              keys: data.keys.map((k) => ({
                ...k,
                isDefault: k.id === key.id,
              })),
            }
          : undefined,
        false,
      );

      await api
        .patch(`signing/key/${key.id}`, {
          json: { isDefault: true },
        })
        .json();

      toast.success("Default key updated");
      mutate();
    } catch (err: any) {
      const errorData = await err.response?.json().catch(() => ({}));
      toast.error(
        errorData?.error || err.message || "Failed to set default key",
      );
      mutate(); // Revert on error
    }
  };

  return (
    <SettingsLayout>
      <SettingsCard
        description={
          <p className="space-y-2">
            <p>Manage your private keys for signing nanopublications</p>
            <div className="flex items-start italic">
              <AlertCircle className="mt-1 mr-2" />
              <span className="mt-1.5 mr-2">
                These keys should be kept secret like a password and never
                shared
              </span>
            </div>
          </p>
        }
        instructions=" You must have at least one valid key set as default in order to publish."
        isPending={isKeysLoading}
        title="Signing Keys"
        actionLabel="Add Key"
        action={() => setIsAddDialogOpen(true)}
      >
        <CardContent>
          <div className="space-y-6">
            {error ? (
              <div className="text-destructive">Error loading keys</div>
            ) : !data?.keys.length && !isKeysLoading ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No signing keys found. Add one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {data?.keys.map((key) => (
                  <SigningKeyCard
                    key={key.id}
                    signingKey={key}
                    onDelete={() => handleDeleteKey(key.id)}
                    onSetDefault={() => handleSetDefault(key)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <div className="flex items-center">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Signing Key</DialogTitle>
                  <DialogDescription>
                    Enter your private key details below, or allow Science Live
                    to generate one. The key will be securely encrypted and
                    stored in Science Live servers.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddKey} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Key Name (Optional)</Label>
                    <Input
                      id="name"
                      placeholder="e.g. My Laptop Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="generateKey"
                      checked={generateKey}
                      onCheckedChange={setGenerateKey}
                    />
                    <Label htmlFor="generateKey">Generate a key for me</Label>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="privateKey">Private Key</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={generateKey}
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Upload .pem file
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pem,.key,.txt"
                        onChange={handleFileUpload}
                        disabled={generateKey}
                      />
                    </div>
                    <Textarea
                      id="privateKey"
                      placeholder="e.g.
-----BEGIN PRIVATE KEY-----
 ...
-----END PRIVATE KEY-----"
                      spellCheck="false"
                      className="font-mono text-xs min-h-25"
                      value={newPrivateKey}
                      onChange={(e) => setNewPrivateKey(e.target.value)}
                      required={!generateKey}
                      disabled={generateKey}
                    />
                    <p className="text-xs text-muted-foreground">
                      {generateKey
                        ? "A new private key will be generated automatically."
                        : "Paste your private key text or upload a .pem key file."}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="default"
                      checked={isDefaultNew}
                      onCheckedChange={setIsDefaultNew}
                    />
                    <Label htmlFor="default">Set as default key</Label>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting || (!generateKey && !newPrivateKey)
                      }
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Key
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </SettingsCard>
    </SettingsLayout>
  );
}

function SigningKeyCard({
  signingKey,
  onDelete,
  onSetDefault,
}: {
  signingKey: SigningKey;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const { data: keyDetail, isLoading: isDetailLoading } =
    useSWR<SigningKeyDetail>(
      showKey ? `/signing/key/${signingKey.id}` : null,
      fetcher,
    );
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (keyDetail?.privateKey) {
      navigator.clipboard.writeText(keyDetail.privateKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Private key copied to clipboard");
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileKey className="h-7 w-7 text-muted-foreground" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold">
                  {signingKey.name || "Unnamed Key"}
                </span>
                {signingKey.isDefault && (
                  <Badge className="text-xs">Default</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <RelativeDateTime
                  className="text-xs"
                  prefix="Added "
                  date={signingKey.createdAt}
                />
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!signingKey.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetDefault}
                title="Set as default"
              >
                Set Default
              </Button>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Signing Key?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this key?
                    <b> This action cannot be undone.</b> You will not be able
                    to sign new nanopublications with this key.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={onDelete} variant="destructive">
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="pt-2">
          {!showKey ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKey(true)}
              className="w-full sm:w-auto"
            >
              <Eye className="mr-2 h-3 w-3" /> Show Private Key
            </Button>
          ) : (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                {isDetailLoading ? (
                  <div className="flex items-center justify-center h-20 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <pre className="p-3 rounded-md bg-muted text-xs font-mono break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {keyDetail?.privateKey}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={handleCopy}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey(false)}
                className="w-full sm:w-auto"
              >
                <EyeOff className="mr-2 h-3 w-3" /> Hide Private Key
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
