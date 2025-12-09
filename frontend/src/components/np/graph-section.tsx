import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NanopubStore } from "@/lib/nanopub-store";
import { Statement } from "@/lib/rdf";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronsUpDown, File, LucideIcon } from "lucide-react";
import { Util } from "n3";

function TripleCell({
  display,
  className,
}: {
  display: { text: string; href?: string };
  className?: string;
}) {
  return (
    <td
      className={`py-2 align-top font-mono text-sm wrap-break-word max-w-0 ${className || ""}`}
    >
      {display.href ? (
        <a
          className="text-blue-600 dark:text-blue-300 hover:underline"
          href={display.href}
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
}: {
  store: NanopubStore;
  st: Statement;
  excludeSub?: boolean;
}) {
  const s = {
    text: store.fetchLabel(st.subject.value as string),
    href: st.subject.value,
  };
  const p = {
    text: store.fetchLabel(st.predicate.value as string),
    href: st.predicate.value,
  };
  const o = Util.isLiteral(st.object)
    ? { text: st.object.value }
    : {
        text: store.fetchLabel(st.object.value as string),
        href: st.object.value,
      };

  return (
    <tr className="border-b last:border-b-0">
      {!excludeSub && <TripleCell display={s} className="pr-3" />}
      <TripleCell display={p} className="px-3 text-muted-foreground" />
      <TripleCell display={o} className="pl-3" />
    </tr>
  );
}

export function GraphSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
}) {
  return (
    <Card
      className={
        "hover:shadow-md transition-shadow cursor-pointer m-0 " + extraClasses
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-left">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 pl-4">Subject</th>
              <th className="py-2 px-3">Predicate</th>
              <th className="py-2 pl-3 pr-4">Object</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {statements.map((st, idx) => (
              <TripleRow store={store} key={idx} st={st} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function CollapsibleGraphSection({
  store,
  title,
  statements,
  Icon = File,
  extraClasses,
}: {
  store: NanopubStore;
  title: string;
  statements: Statement[];
  Icon: LucideIcon;
  extraClasses?: string;
}) {
  const pubStatements: Statement[] = [];
  const sigStatements: Statement[] = [];
  const otherStatements: Statement[] = [];

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
    <Card
      className={
        "hover:shadow-md transition-shadow cursor-pointer m-0 " + extraClasses
      }
    >
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
            <Card
              className={"hover:shadow-md transition-shadow cursor-pointer m-3"}
            >
              <CardContent>
                <p className="mb-2 font-medium">This Nanopublication...</p>
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/2" />
                  </colgroup>
                  <tbody className="divide-y">
                    {pubStatements.map((st, idx) => (
                      <TripleRow store={store} key={idx} st={st} excludeSub />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card
              className={"hover:shadow-md transition-shadow cursor-pointer m-3"}
            >
              <CardContent>
                <p className="mb-2 font-medium">Signature...</p>
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/2" />
                  </colgroup>
                  <tbody className="divide-y">
                    {sigStatements.map((st, idx) => (
                      <TripleRow store={store} key={idx} st={st} excludeSub />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <CardContent>
              <p className="mb-4 mt-4 font-medium">Other info</p>
              <table className="w-full text-left">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 pl-4">Subject</th>
                    <th className="py-2 px-3">Predicate</th>
                    <th className="py-2 pl-3 pr-4">Object</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {otherStatements.map((st, idx) => (
                    <TripleRow store={store} key={idx} st={st} />
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
