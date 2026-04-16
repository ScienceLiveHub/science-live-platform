/**
 * ODRL Access Policy creation form.
 *
 * Sentence-based layout matching the Nanodash template editor style.
 * Subject (policy URI) is shared across all statements. `permGroup` is a
 * repeatable grouped statement with action + purpose constraint.
 * `prohibGroup` and `dutyGroup` are optional grouped statements.
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
const DPV_NS = "https://w3id.org/dpv#";

const POLICY_TYPES = [
  {
    value: ODRL_NS + "Offer",
    label: "Offer (data available under conditions)",
  },
  { value: ODRL_NS + "Set", label: "Set (general policy statement)" },
];

const PERMITTED_ACTIONS = [
  { value: ODRL_NS + "use", label: "Use" },
  { value: ODRL_NS + "reproduce", label: "Reproduce" },
  { value: ODRL_NS + "derive", label: "Derive" },
  { value: ODRL_NS + "modify", label: "Modify" },
  { value: ODRL_NS + "distribute", label: "Distribute" },
  { value: ODRL_NS + "present", label: "Present" },
];

const PURPOSES = [
  { value: DPV_NS + "AcademicResearch", label: "Academic Research" },
  { value: DPV_NS + "ScientificResearch", label: "Scientific Research" },
  {
    value: DPV_NS + "NonCommercialResearch",
    label: "Non-Commercial Research",
  },
  { value: DPV_NS + "PublicBenefit", label: "Public Benefit" },
];

const PROHIBITED_ACTIONS = [
  { value: ODRL_NS + "commercialize", label: "Commercialize" },
  { value: ODRL_NS + "sell", label: "Sell" },
  { value: ODRL_NS + "distribute", label: "Distribute" },
  { value: ODRL_NS + "modify", label: "Modify" },
];

const DUTY_ACTIONS = [
  { value: ODRL_NS + "attribute", label: "Attribute" },
  { value: ODRL_NS + "compensate", label: "Compensate" },
  { value: ODRL_NS + "obtainConsent", label: "Obtain Consent" },
];

interface Permission {
  permittedAction: string;
  purposeConstraint: string;
}
interface Prohibition {
  prohibitedAction: string;
}
interface Duty {
  dutyAction: string;
  attributionParty: string;
}

interface FormState {
  policyUri: string;
  policyType: string;
  datasetUri: string;
  permGroup: Permission[];
  prohibGroup: Prohibition[];
  dutyGroup: Duty[];
  isExampleNanopub?: boolean;
}

export default function ODRLPolicy({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const [state, setState] = useState<FormState>(() => ({
    policyUri: "",
    policyType: ODRL_NS + "Offer",
    datasetUri: "",
    permGroup: [
      {
        permittedAction: ODRL_NS + "use",
        purposeConstraint: DPV_NS + "AcademicResearch",
      },
    ],
    prohibGroup: [],
    dutyGroup: [],
    isExampleNanopub: false,
    ...(prefilledData as Partial<FormState>),
  }));
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<FormState>) =>
    setState((s) => ({ ...s, ...patch }));

  // Permissions
  const addPerm = () =>
    update({
      permGroup: [
        ...state.permGroup,
        {
          permittedAction: ODRL_NS + "use",
          purposeConstraint: DPV_NS + "AcademicResearch",
        },
      ],
    });
  const removePerm = (i: number) =>
    update({ permGroup: state.permGroup.filter((_, idx) => idx !== i) });
  const updatePerm = (i: number, patch: Partial<Permission>) =>
    update({
      permGroup: state.permGroup.map((p, idx) =>
        idx === i ? { ...p, ...patch } : p,
      ),
    });

  // Prohibitions
  const addProhib = () =>
    update({
      prohibGroup: [
        ...state.prohibGroup,
        { prohibitedAction: ODRL_NS + "commercialize" },
      ],
    });
  const removeProhib = (i: number) =>
    update({ prohibGroup: state.prohibGroup.filter((_, idx) => idx !== i) });
  const updateProhib = (i: number, prohibitedAction: string) =>
    update({
      prohibGroup: state.prohibGroup.map((p, idx) =>
        idx === i ? { prohibitedAction } : p,
      ),
    });

  // Duties
  const addDuty = () =>
    update({
      dutyGroup: [
        ...state.dutyGroup,
        { dutyAction: ODRL_NS + "attribute", attributionParty: "" },
      ],
    });
  const removeDuty = (i: number) =>
    update({ dutyGroup: state.dutyGroup.filter((_, idx) => idx !== i) });
  const updateDuty = (i: number, patch: Partial<Duty>) =>
    update({
      dutyGroup: state.dutyGroup.map((d, idx) =>
        idx === i ? { ...d, ...patch } : d,
      ),
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Clean up empty optional groups and empty attribution strings
      const payload: Record<string, unknown> = {
        policyUri: state.policyUri,
        policyType: state.policyType,
        datasetUri: state.datasetUri,
        permGroup: state.permGroup,
        isExampleNanopub: state.isExampleNanopub,
      };
      if (state.prohibGroup.length > 0) {
        payload.prohibGroup = state.prohibGroup;
      }
      if (state.dutyGroup.length > 0) {
        payload.dutyGroup = state.dutyGroup.map((d) => {
          const cleaned: Record<string, string> = { dutyAction: d.dutyAction };
          if (d.attributionParty) {
            cleaned.attributionParty = d.attributionParty;
          }
          return cleaned;
        });
      }
      await submit(payload as Record<string, string | object>);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Policy identifier (shared subject) */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-2">
        <Label htmlFor="policyUri" className="text-sm font-medium">
          Policy identifier
        </Label>
        <PrefixedInput
          id="policyUri"
          prefix="https://fair2adapt.eu/policy/"
          prefixLabel="fair2adapt-policy"
          value={state.policyUri}
          onChange={(v) => update({ policyUri: v })}
          placeholder="my-policy"
          required
        />
        <p className="text-xs text-muted-foreground">
          Unique identifier for this policy. All statements below apply to this
          policy.
        </p>
      </div>

      {/* Permissions (required, repeatable) */}
      <StatementBlock
        groupLabel="Permissions"
        groupHint="Actions the policy permits, each with a required purpose."
      >
        {state.permGroup.map((perm, i) => (
          <div
            key={i}
            className="space-y-2 pb-3 border-b last:border-b-0 last:pb-0"
          >
            <StatementRow subject="Policy" predicate="has permission → action">
              <Select
                value={perm.permittedAction}
                onValueChange={(v) => updatePerm(i, { permittedAction: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Permitted action" />
                </SelectTrigger>
                <SelectContent>
                  {PERMITTED_ACTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StatementRow>
            <StatementRow
              subject="↳"
              predicate="only if purpose is"
              onRemove={
                state.permGroup.length > 1 ? () => removePerm(i) : undefined
              }
            >
              <Select
                value={perm.purposeConstraint}
                onValueChange={(v) => updatePerm(i, { purposeConstraint: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Purpose" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StatementRow>
          </div>
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

      {/* Prohibitions (optional, repeatable) */}
      <StatementBlock
        groupLabel="Prohibitions (optional)"
        groupHint="Actions the policy explicitly prohibits."
      >
        {state.prohibGroup.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No prohibitions. Click below to add one.
          </p>
        )}
        {state.prohibGroup.map((proh, i) => (
          <StatementRow
            key={i}
            subject="Policy"
            predicate="has prohibition → action"
            onRemove={() => removeProhib(i)}
          >
            <Select
              value={proh.prohibitedAction}
              onValueChange={(v) => updateProhib(i, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prohibited action" />
              </SelectTrigger>
              <SelectContent>
                {PROHIBITED_ACTIONS.map((opt) => (
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
          onClick={addProhib}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add prohibition
        </Button>
      </StatementBlock>

      {/* Duties (optional) */}
      <StatementBlock
        groupLabel="Duties (optional)"
        groupHint="Obligations the requester must fulfil when using the data."
      >
        {state.dutyGroup.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No duties. Click below to add one.
          </p>
        )}
        {state.dutyGroup.map((duty, i) => (
          <div
            key={i}
            className="space-y-2 pb-3 border-b last:border-b-0 last:pb-0"
          >
            <StatementRow subject="Policy" predicate="has duty → action">
              <Select
                value={duty.dutyAction}
                onValueChange={(v) => updateDuty(i, { dutyAction: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duty action" />
                </SelectTrigger>
                <SelectContent>
                  {DUTY_ACTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </StatementRow>
            <StatementRow
              subject="↳"
              predicate="attributed to (optional)"
              onRemove={() => removeDuty(i)}
            >
              <Input
                value={duty.attributionParty}
                onChange={(e) =>
                  updateDuty(i, { attributionParty: e.target.value })
                }
                placeholder="https://fair2adapt-eosc.eu"
              />
            </StatementRow>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDuty}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add duty
        </Button>
      </StatementBlock>

      {/* Target dataset */}
      <StatementRow subject="Policy" predicate="applies to dataset">
        <PrefixedInput
          prefix="https://fair2adapt.eu/data/"
          prefixLabel="fair2adapt-data"
          value={state.datasetUri}
          onChange={(v) => update({ datasetUri: v })}
          placeholder="my-dataset"
          required
        />
      </StatementRow>

      {/* Policy type */}
      <StatementRow subject="Policy" predicate="is a">
        <Select
          value={state.policyType}
          onValueChange={(v) => update({ policyType: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Type of ODRL policy" />
          </SelectTrigger>
          <SelectContent>
            {POLICY_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

/* --- Layout helpers --- */

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
  id,
  prefix,
  prefixLabel,
  value,
  onChange,
  placeholder,
  required,
}: {
  id?: string;
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
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="flex-1 px-3 py-2 text-sm bg-transparent outline-none min-w-0"
      />
    </div>
  );
}
