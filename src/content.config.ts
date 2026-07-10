import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const itineraryDay = z.object({
  day: z.number(),
  title: z.string(),
  description: z.string(),
});

const imageCredit = z.object({
  src: z.string(),
  alt: z.string(),
  author: z.string().optional(),
  authorUrl: z.string().optional(),
  license: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const treks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/treks' }),
  schema: z.object({
    title: z.string(),
    region: z.string(),
    regionSlug: z.string(),
    country: z.string().default('India'),
    difficulty: z.enum(['Easy', 'Moderate', 'Difficult', 'Strenuous']),
    durationDays: z.number(),
    maxAltitudeM: z.number(),
    distanceKm: z.number(),
    bestSeason: z.array(z.string()),
    startingPoint: z.string(),
    endingPoint: z.string(),
    groupSize: z.string().optional(),
    shortDescription: z.string(),
    highlights: z.array(z.string()),
    itinerary: z.array(itineraryDay),
    howToReach: z.string(),
    permits: z.string(),
    tags: z.array(z.string()).default([]),
    heroImage: imageCredit,
    gallery: z.array(imageCredit).default([]),
    seoTitle: z.string(),
    seoDescription: z.string(),
    featured: z.boolean().default(false),
  }),
});

const regions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/regions' }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    tagline: z.string(),
    description: z.string(),
    heroImage: imageCredit,
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

export const collections = { treks, regions };
