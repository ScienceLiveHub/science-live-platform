/**
 * ODRL Access Grant creation form.
 *
 * Uses a sentence-based layout (subject → predicate text → object input),
 * mirroring the Nanodash template editor style. Subject URI is shared across
 * all statements. `permGroup` is a repeatable grouped statement.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { NanopubTemplateDefComponentProps } from "./component-registry";

const ODRL_NS = "http://www.w3.org/ns/odrl/2/";

const GRANTED_ACTIONS = [
  { value: ODRL_NS + "use", label: "Use" },
  { value: ODRL_NS + "reproduce", label: "Reproduce" },
  { value: ODRL_NS + "distribute", label: "Distribute" },
];

interface FormState {
  grantUri: string;
  datasetUri: string;
  assigneeDid: string;
  policyNanopubUri: string;
  grantTimestamp: string;
  permGroup: { grantedAction: string }[];
  isExampleNanopub?: boolean;
}

export default function ODRLAccessGrant({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [state, setState] = useState<FormState>(() => ({
    grantUri: "",
    datasetUri: "",
    assigneeDid: "",
    policyNanopubUri: "",
    grantTimestamp: new Date().toISOString(),
    permGroup: [{ grantedAction: ODRL_NS + "use" }],
    isExampleNanopub: false,
    ...(prefilledData as Partial<FormState>),
  }));
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<FormState>) =>
    setState((s) => ({ ...s, ...patch }));

  const addPerm = () =>
    update({
      permGroup: [...state.permGroup, { grantedAction: ODRL_NS + "use" }],
    });

  const removePerm = (i: number) =>
    update({ permGroup: state.permGroup.filter((_, idx) => idx !== i) });

  const updatePerm = (i: number, grantedAction: string) =>
    update({
      permGroup: state.permGroup.map((p, idx) =>
        idx === i ? { grantedAction } : p,
      ),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await submit(state as unknown as Record<string, string | object>);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grant identifier (shared subject) */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-2">
        <Label htmlFor="grantUri" className="text-sm font-medium">
          Grant identifier
        </Label>
        <Input
          id="grantUri"
          value={state.grantUri}
          onChange={(e) => update({ grantUri: e.target.value })}
          placeholder="https://fair2adapt.eu/grant/..."
          required
        />
        <p className="text-xs text-muted-foreground">
          Unique URI for this access grant. All statements below apply to this
          identifier.
        </p>
      </div>

      {/* Permissions (repeatable) */}
      <StatementBlock
        groupLabel="Permissions"
        groupHint="One or more actions the requester is allowed to perform."
      >
        {state.permGroup.map((perm, i) => (
          <StatementRow
            key={i}
            subject="Grant"
            predicate="has permission → action"
            onRemove={
              state.permGroup.length > 1 ? () => removePerm(i) : undefined
            }
          >
            <Select
              value={perm.grantedAction}
              onValueChange={(v) => updatePerm(i, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Granted action" />
              </SelectTrigger>
              <SelectContent>
                {GRANTED_ACTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </StatementRow>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPerm}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add permission
        </Button>
      </StatementBlock>

      {/* Assignee DID */}
      <StatementRow subject="Grant" predicate="is granted to">
        <Input
          value={state.assigneeDid}
          onChange={(e) => update({ assigneeDid: e.target.value })}
          placeholder="did:web:researcher.example.org"
          required
        />
      </StatementRow>

      {/* Under policy */}
      <StatementRow subject="Grant" predicate="under ODRL policy">
        <PrefixedInput
          prefix="https://w3id.org/np/"
          prefixLabel="nanopub"
          value={state.policyNanopubUri}
          onChange={(v) => update({ policyNanopubUri: v })}
          placeholder="RA..."
          required
        />
      </StatementRow>

      {/* Target dataset */}
      <StatementRow subject="Grant" predicate="grants access to dataset">
        <PrefixedInput
          prefix="https://fair2adapt.eu/data/"
          prefixLabel="fair2adapt-data"
          value={state.datasetUri}
          onChange={(v) => update({ datasetUri: v })}
          placeholder="my-dataset"
          required
        />
      </StatementRow>

      {/* Timestamp */}
      <StatementRow subject="Grant" predicate="granted at time">
        <Input
          type="datetime-local"
          value={toLocalInput(state.grantTimestamp)}
          onChange={(e) =>
            update({ grantTimestamp: fromLocalInput(e.target.value) })
          }
          required
        />
      </StatementRow>

      {/* Type (constant) */}
      <StatementRow subject="Grant" predicate="is a">
        <Badge variant="secondary" className="text-sm">
          ODRL Agreement
        </Badge>
      </StatementRow>

      {/* Example nanopub option */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <input
          id="isExampleNanopub"
          type="checkbox"
          checked={state.isExampleNanopub ?? false}
          onChange={(e) => update({ isExampleNanopub: e.target.checked })}
        />
        <Label htmlFor="isExampleNanopub" className="text-sm">
          Create Example Nanopub (for testing and demo purposes)
        </Label>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Generating..." : "Generate Nanopublication"}
      </Button>
    </form>
  );
}

/** A horizontal row: subject label → predicate text → object input. */
function StatementRow({
  subject,
  predicate,
  children,
  onRemove,
}: {
  subject: string;
  predicate: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Badge variant="outline" className="font-mono shrink-0">
          {subject}
        </Badge>
        <span className="text-muted-foreground whitespace-nowrap">
          {predicate}
        </span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/** A visually grouped block (used for repeatable groups). */
function StatementBlock({
  groupLabel,
  groupHint,
  children,
}: {
  groupLabel: string;
  groupHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">{groupLabel}</p>
        {groupHint && (
          <p className="text-xs text-muted-foreground">{groupHint}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * An input with a prefix chip displayed before the text field.
 * The form only stores the suffix; the template engine prepends the prefix
 * at generation time (see `nt:hasPrefix` in the template).
 */
function PrefixedInput({
  prefix,
  prefixLabel,
  value,
  onChange,
  placeholder,
  required,
}: {
  prefix: string;
  prefixLabel: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div
      className="flex items-center rounded-md border focus-within:ring-1 focus-within:ring-ring overflow-hidden"
      title={prefix}
    >
      <span className="px-2 py-2 text-xs font-mono bg-muted text-muted-foreground border-r whitespace-nowrap">
        {prefixLabel}:
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
      />
    </div>
  );
}

/** Convert ISO string → datetime-local input value. */
function toLocalInput(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    // YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

/** Convert datetime-local input → ISO string. */
function fromLocalInput(value: string): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString();
  } catch {
    return value;
  }
}
