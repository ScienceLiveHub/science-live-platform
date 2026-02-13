import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NanopubStore } from "@/lib/nanopub-store";
import { Statement } from "@/lib/rdf";
import { isNanopubUri, toScienceLiveNPUri } from "@/lib/uri";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronsUpDown, File, LucideIcon } from "lucide-react";
import { Term, Util } from "n3";

const introducedClass = "border-2 p-0.5 px-1.5 rounded-sm font-bold";

function TripleCell({
  display,
  className,
  innerClassName,
  colSpan,
}: {
  display: { text: string; href?: string };
  className?: string;
  innerClassName?: string;
  colSpan?: number;
}) {
  return (
    <td
      className={`py-2 align-top font-mono text-sm ${className || ""}`}
      colSpan={colSpan}
    >
      {display.href ? (
        <a
          className={`text-blue-600 dark:text-blue-300 hover:underline ${innerClassName || ""}`}
          href={
            isNanopubUri(display.href)
              ? toScienceLiveNPUri(display.href)
              : display.href
          }
          target="_blank"
          rel="noreferrer"
        >
          {display.text}
        </a>
      ) : (
        display.text
      )}
    </td>
  );
}

function TripleRow({
  store,
  st,
  excludeSub,
  className,
  getLabel,
}: {
  store: NanopubStore;
  st: Statement;
  excludeSub?: boolean;
  className?: string;
  getLabel: (term: Term | string) => string;
}) {
  const s = !excludeSub
    ? {
        text: decodeURI(
          store.findInternalLabel(st.subject.value) ??
            getLabel(st.subject.value as string),
        ),
        href: st.subject.value,
      }
    : { text: "-" };
  const p = {
    text:
      store.findInternalLabel(st.predicate.value) ??
      getLabel(st.predicate.value as string),
    href: st.predicate.value,
  };
  const o = Util.isLiteral(st.object)
    ? { text: st.object.value }
    : {
        text:
          store.findInternalLabel(st.object.value) ??
          getLabel(st.object.value as string),
        href: st.object.value,
      };

  return (
    <tr className="border-b last:border-b-0">
      {!excludeSub && (
        <TripleCell
          display={s}
          className={`pr-3 font-bold ${className ?? ""}`}
          innerClassName={`${store.metadata.introduces?.some((i) => i.uri === s.href) ? introducedClass : ""}`}
        />
      )}
      <TripleCell
        display={p}
        className={`${excludeSub ? "pl-6" : "pl-3"} pr-3 text-muted-foreground ${className ?? ""}`}
      />
      <TripleCell
        display={o}
        className={`pl-3 wrap-anywhere ${className ?? ""}`}
        innerClassName={
          store.metadata.introduces?.some((i) => i.uri === o.href)
            ? introducedClass
            : undefined
        }
        colSpan={excludeSub ? 2 : undefined}
      />
    </tr>
  );
}

export function GraphSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
  getLabel,
  collapsible = false,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
  getLabel: (term: Term | string) => string;
  collapsible?: boolean;
}) {
  const header = (
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      {title}
      {collapsible && (
        <Button variant="ghost" size="icon" className="size-8">
          <ChevronsUpDown />
          <span className="sr-only">Toggle</span>
        </Button>
      )}
    </CardTitle>
  );

  const content = (
    <CardContent>
      <table className="text-left">
        <tbody className="divide-y">
          {statements.map((st, idx) => {
            const repeat = st.subject.equals(statements[idx - 1]?.subject);
            const firstOfRepeat =
              !repeat && st.subject.equals(statements[idx + 1]?.subject);
            return (
              <>
                {/* Avoid repeating the subject if there are multiple rows with it,
                    just show it once on its own row */}
                {firstOfRepeat && (
                  <tr>
                    <TripleCell
                      display={{
                        text: decodeURI(
                          store.findInternalLabel(st.subject.value) ??
                            getLabel(st.subject.value as string),
                        ),
                        href: st.subject.value,
                      }}
                      className={`mb-2 font-bold ${firstOfRepeat || !repeat ? " pt-8" : ""}`}
                      // Introduced objects get a border around them
                      innerClassName={`${
                        store.metadata.introduces?.some(
                          (i) => i.uri === st.subject.value,
                        )
                          ? introducedClass
                          : undefined
                      }`}
                      colSpan={3}
                    />
                  </tr>
                )}
                <TripleRow
                  store={store}
                  key={idx}
                  st={st}
                  getLabel={getLabel}
                  excludeSub={firstOfRepeat || repeat}
                  className={
                    !(firstOfRepeat || repeat || idx == 0) ? "pt-6" : undefined
                  }
                />
              </>
            );
          })}
        </tbody>
      </table>
    </CardContent>
  );

  return (
    <Card className={"hover:shadow-md transition-shadow m-0 " + extraClasses}>
      {collapsible ? (
        <Collapsible>
          <CardHeader>
            <CollapsibleTrigger>{header}</CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>{content}</CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <CardHeader>{header}</CardHeader>
          {content}
        </>
      )}
    </Card>
  );
}

export function PubInfoSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
  getLabel,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
  getLabel: (term: Term | string) => string;
}) {
  const pubStatements: Statement[] = [];
  const sigStatements: Statement[] = [];
  const otherStatements: Statement[] = [];

  // Filter statements into sections for display
  statements.forEach((st) => {
    const sub = st.subject.value;
    if (sub === store.prefixes["this"]) {
      pubStatements.push(st);
    } else if (
      sub === store.prefixes["this"] + "/sig" ||
      sub === store.prefixes["this"] + "#sig"
    ) {
      sigStatements.push(st);
    } else {
      otherStatements.push(st);
    }
  });

  return (
    <Card className={"hover:shadow-md transition-shadow m-0 " + extraClasses}>
      <Collapsible>
        <CardHeader>
          <CollapsibleTrigger>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {title}{" "}
              <Button variant="ghost" size="icon" className="size-8">
                <ChevronsUpDown />
                <span className="sr-only">Toggle</span>
              </Button>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Card className={"hover:shadow-md transition-shadow m-3"}>
              <CardContent>
                <p className="mb-2 font-medium">This Nanopublication...</p>
                <table className="table-auto text-left">
                  <tbody className="divide-y">
                    {pubStatements.map((st, idx) => (
                      <TripleRow
                        store={store}
                        key={idx}
                        st={st}
                        excludeSub
                        getLabel={getLabel}
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className={"hover:shadow-md transition-shadow m-3"}>
              <CardContent>
                <p className="mb-2 font-medium">Signature...</p>
                <table className="table-auto text-left">
                  <tbody className="divide-y">
                    {sigStatements.map((st, idx) => (
                      <TripleRow
                        store={store}
                        key={idx}
                        st={st}
                        excludeSub
                        getLabel={getLabel}
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <CardContent>
              <p className="mb-4 mt-4 font-medium">Other info</p>
              <table className="table-auto text-left">
                <tbody className="divide-y">
                  {otherStatements.map((st, idx) => (
                    <TripleRow
                      store={store}
                      key={idx}
                      st={st}
                      getLabel={getLabel}
                    />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
