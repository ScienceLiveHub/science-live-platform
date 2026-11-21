/**
 * Reads a User Story nanopub's assertion into the parts its view shows. Kept apart
 * from ViewUserStory so that file exports only components.
 */

import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import { DataFactory } from "n3";
import {
  DECLARED_FOR_DIGITAL_OBJECT_TYPE,
  USER_STORY_NAMESPACES,
} from "../create/components/templates/user-story-terms";

const { namedNode } = DataFactory;

export interface UserStoryData {
  title: string;
  asA?: string;
  iWantTo?: string;
  soThat?: string;
  domains: string[];
  challenges: string[];
  exposed: string[];
  digitalObjectTypes: string[];
}

export function extractUserStory(store: NanopubStore): UserStoryData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);

  // The story is the subject typed User-Story, in either vocabulary
  const typeQuad = USER_STORY_NAMESPACES.map((ns) =>
    store.matchOne(null, NS.RDF("type"), namedNode(ns + "User-Story"), g),
  ).find(Boolean);
  if (!typeQuad || typeQuad.subject.termType !== "NamedNode") return null;
  const story = namedNode(typeQuad.subject.value);

  const values = (local: string) =>
    USER_STORY_NAMESPACES.flatMap((ns) =>
      store
        .getQuads(story, namedNode(ns + local), null, g)
        .map((q) => q.object.value),
    );

  return {
    title:
      store.matchOne(story, NS.RDFS("label"), null, g)?.object.value ||
      store.metadata.title ||
      "User story",
    asA: values("as-a")[0],
    iWantTo: values("i-want-to")[0],
    soThat: values("so-that")[0],
    domains: values("covers-domain"),
    challenges: values("faces-challenge"),
    exposed: values("exposed-entity"),
    digitalObjectTypes: store
      .getQuads(story, namedNode(DECLARED_FOR_DIGITAL_OBJECT_TYPE), null, g)
      .map((q) => q.object.value),
  };
}
