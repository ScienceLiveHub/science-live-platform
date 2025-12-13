export const usersLatestNanopubs = (orcidUri: string, limit = 10) => `
prefix pc: <http://purl.org/petapico/o/paperclub#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix dct: <http://purl.org/dc/terms/>
prefix np: <http://www.nanopub.org/nschema#>
prefix npa: <http://purl.org/nanopub/admin/>
prefix npx: <http://purl.org/nanopub/x/>

select ?paper ?comment ?label ?np ?date where {
graph npa:graph {
    ?np npa:hasValidSignatureForPublicKeyHash ?pubkey .
    filter not exists { ?npx npx:invalidates ?np ; npa:hasValidSignatureForPublicKeyHash ?pubkey . }
    ?np dct:created ?date .
    ?np rdfs:label ?label .
    ?np npx:signedBy <${orcidUri}> .
    ?np np:hasAssertion ?a .
}
} order by desc(?date) limit ${limit}
`;
