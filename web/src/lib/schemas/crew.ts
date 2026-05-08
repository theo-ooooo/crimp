import { z } from 'zod';

/**
 * Crew 관련 zod 스키마 (웹).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/crew/CrewController.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/crew/CrewView.java
 */

export const CrewLevelBandSchema = z.enum(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type CrewLevelBand = z.infer<typeof CrewLevelBandSchema>;

export const CrewStyleSchema = z.enum(['BOULDERING', 'LEAD', 'BOTH']);
export type CrewStyle = z.infer<typeof CrewStyleSchema>;

export const CrewJoinPolicySchema = z.enum(['APPROVAL', 'OPEN', 'INVITE_ONLY']);
export type CrewJoinPolicy = z.infer<typeof CrewJoinPolicySchema>;

export const CrewMyStatusSchema = z.enum(['NONE', 'PENDING', 'MEMBER', 'OWNER', 'ADMIN']);
export type CrewMyStatus = z.infer<typeof CrewMyStatusSchema>;

export const CrewPageSchema = z.object({
  nextCursor: z.number().nullable(),
  size: z.number().int(),
});

export type CrewPage = z.infer<typeof CrewPageSchema>;

export const CrewHomeGymSchema = z.object({
  extId: z.string(),
  name: z.string(),
});

export type CrewHomeGym = z.infer<typeof CrewHomeGymSchema>;

export const CrewOwnerSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
});

export type CrewOwner = z.infer<typeof CrewOwnerSchema>;

export const CrewItemSchema = z.object({
  extId: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  region: z.string().nullable(),
  homeGym: CrewHomeGymSchema.nullable(),
  levelBand: CrewLevelBandSchema,
  style: CrewStyleSchema,
  memberCount: z.number().int(),
  capacity: z.number().int().nullable(),
  joinPolicy: CrewJoinPolicySchema,
  myStatus: CrewMyStatusSchema,
});

export type CrewItem = z.infer<typeof CrewItemSchema>;

export const CrewListSchema = z.object({
  items: z.array(CrewItemSchema),
  page: CrewPageSchema,
});

export type CrewList = z.infer<typeof CrewListSchema>;

export const CrewDetailSchema = CrewItemSchema.extend({
  description: z.string().nullable(),
  owner: CrewOwnerSchema,
  createdAt: z.string(),
});

export type CrewDetail = z.infer<typeof CrewDetailSchema>;

export const CreateCrewJoinRequestBodySchema = z.object({
  message: z.string().max(500).nullable().optional(),
});

export type CreateCrewJoinRequestBody = z.infer<typeof CreateCrewJoinRequestBodySchema>;
