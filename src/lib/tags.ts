export function parseTags(input: string): string[] {
  const matches = input.match(/#([^\s#]+)/g) ?? []
  return [...new Set(matches.map((t) => t.slice(1)))]
}

export function buildTagsFromIncident(
  generalContractor: string,
  siteName: string,
  extraTags: string[]
): string[] {
  return [...new Set([generalContractor, siteName, ...extraTags].filter(Boolean))]
}

export function formatTag(tag: string) {
  return `#${tag}`
}
