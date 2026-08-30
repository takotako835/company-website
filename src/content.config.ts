import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// お知らせ記事(docs/content/news.md の frontmatter 仕様に準拠)
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['お知らせ', 'プレスリリース', 'コラム']),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
