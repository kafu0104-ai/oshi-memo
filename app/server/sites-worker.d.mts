export function enrichOfficialPage(page: {html: string; url: string}, fetcher?: typeof fetch): Promise<{html: string; url: string; warning?: string}>;
