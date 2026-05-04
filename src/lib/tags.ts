export function parseTags(input: string): string[] {
  const tokens = input.trim().split(/[\s　]+/).filter(Boolean)
  // 先頭に # が付いていても付いていなくても同様に処理
  return [...new Set(tokens.map((t) => t.replace(/^#/, '')))]
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
