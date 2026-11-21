/**
 * FORRT study types (Science Live terms), shared by the Replication Study form and the
 * Replication Request form/view. Values are the term URIs used by the templates.
 */
export const STUDY_TYPE_OPTIONS = [
  {
    value: "https://w3id.org/sciencelive/o/terms/Reproduction-Study",
    label:
      "Reproduction Study - direct reproduction: same methodology, same tools",
  },
  {
    value: "https://w3id.org/sciencelive/o/terms/Replication-Study",
    label:
      "Replication Study - replication with different methodology or conditions",
  },
  {
    value:
      "https://w3id.org/sciencelive/o/terms/Reproduction-Replication-Study",
    label:
      "Reproduction/Replication Study - study that is both, reproduction and replication",
  },
];
