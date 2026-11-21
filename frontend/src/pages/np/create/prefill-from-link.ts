/** Link parameters that pre-fill a form field are named `p.<field>` */
const PREFILL_PREFIX = "p.";

/**
 * Field values passed in the link, e.g.
 * `/np/create?template=<uri>&p.paper=10.1002/wat2.1765&p.quotation=…&p.comment=…`,
 * so a prepared nanopublication opens filled in, for the author to review and publish.
 * Only the values are taken: the form still validates them, and nothing is published
 * without the author pressing the button.
 */
export function prefillFromLink(
  params: URLSearchParams,
): Record<string, string> | undefined {
  const values: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith(PREFILL_PREFIX) && key.length > PREFILL_PREFIX.length) {
      values[key.slice(PREFILL_PREFIX.length)] = value;
    }
  });
  return Object.keys(values).length > 0 ? values : undefined;
}
