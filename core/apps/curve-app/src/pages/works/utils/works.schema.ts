import { z } from 'zod';

/**
 * Validation for the work create/edit form.
 *
 * The API is the source of truth: the Work model marks only `title` as
 * `required: true` (see api `models/work/work.js`), so it's the only field
 * validated or marked required here. Every other field is optional, matching
 * the backend.
 *
 * Every WorkFormData field is listed so Zod doesn't strip it from the submitted
 * payload (unknown keys are dropped by default). Complex nested fields are typed
 * permissively — they're managed by their own tab components, not validated here.
 */
export const workSchema = z.object({
  // Core identifiers
  title: z.string().min(1, 'Title is required'),
  composer: z.string().optional(),
  foreignId: z.string().optional(),
  projectId: z.string().optional(),
  identifier: z.string().optional(),
  iswc: z.string().optional(),
  tunecode: z.string().optional(),
  copyrightDate: z.string().optional(),
  labelCopy: z.string().optional(),
  notes: z.string().optional(),
  alternateTitles: z.array(z.object({ title: z.string(), language: z.string().nullable() })).optional(),
  performers: z.array(z.object({ name: z.string() })).optional(),
  // Configuration
  priority: z.boolean().optional(),
  productionLibrary: z.boolean().optional(),
  workLanguage: z.string().optional(),
  workDescriptionCategory: z.string().optional(),
  compositeType: z.string().optional(),
  compositeWorks: z.array(z.object({ title: z.string(), source: z.string() })).optional(),
  // Library (shown when productionLibrary is true)
  libraryTitle: z.string().optional(),
  productionTitle: z.string().optional(),
  cdIdentifier: z.string().optional(),
  cutNo: z.string().optional(),
  // Modification
  versionType: z.string().optional(),
  arrangementType: z.string().optional(),
  lyricAdaptionType: z.string().optional(),
  originalWorkTitle: z.string().optional(),
  originalIswc: z.string().optional(),
  originalWorkSource: z.string().optional(),
  originalWorkWriterLastName: z.string().optional(),
  originalWorkWriterFirstName: z.string().optional(),
  // Rights
  enablePublisherMapping: z.boolean().optional(),
  // Complex fields — managed via setValue() by their respective tab components
  territories: z.array(z.string()).optional(),
  rightsChain: z.array(z.any()).optional(),
});
