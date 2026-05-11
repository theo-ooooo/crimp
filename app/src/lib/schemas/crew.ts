import { z } from 'zod';

/**
 * Crew 관련 zod 스키마 (앱).
 *
 * 참조:
 * - api/crimp-api/src/main/java/io/crimp/api/crew/CrewController.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/crew/CrewView.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/crew/CrewJoinRequestView.java
 * - api/crimp-domain/src/main/java/io/crimp/domain/crew/CrewMemberView.java
 */

export const CrewLevelBandSchema = z.enum(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type CrewLevelBand = z.infer<typeof CrewLevelBandSchema>;

export const CrewStyleSchema = z.enum(['BOULDERING', 'LEAD', 'BOTH']);
export type CrewStyle = z.infer<typeof CrewStyleSchema>;

export const CrewJoinPolicySchema = z.enum(['APPROVAL', 'OPEN', 'INVITE_ONLY']);
export type CrewJoinPolicy = z.infer<typeof CrewJoinPolicySchema>;

export const CrewMyStatusSchema = z.enum(['NONE', 'PENDING', 'MEMBER', 'OWNER', 'ADMIN']);
export type CrewMyStatus = z.infer<typeof CrewMyStatusSchema>;

export const MeetupJoinPolicySchema = z.enum(['OPEN', 'APPROVAL']);
export type MeetupJoinPolicy = z.infer<typeof MeetupJoinPolicySchema>;

export const MeetupParticipationSchema = z.enum(['NONE', 'PENDING', 'JOINED']);
export type MeetupParticipation = z.infer<typeof MeetupParticipationSchema>;

export const MeetupParticipantStatusSchema = z.enum(['PENDING', 'ACTIVE', 'CANCELED']);
export type MeetupParticipantStatus = z.infer<typeof MeetupParticipantStatusSchema>;

export const CrewJoinRequestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']);
export type CrewJoinRequestStatus = z.infer<typeof CrewJoinRequestStatusSchema>;

export const CrewMemberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type CrewMemberRole = z.infer<typeof CrewMemberRoleSchema>;

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
  extId: z.string().nullable(),
  nickname: z.string().nullable(),
});

export type CrewOwner = z.infer<typeof CrewOwnerSchema>;

export const MeetupHostSchema = z.object({
  extId: z.string().nullable(),
  nickname: z.string().nullable(),
});

export type MeetupHost = z.infer<typeof MeetupHostSchema>;

export const CrewMeetupSchema = z.object({
  extId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  crewExtId: z.string().nullable().optional(),
  crewName: z.string().nullable().optional(),
  gymExtId: z.string().nullable().optional(),
  gymName: z.string().nullable().optional(),
  location: z.string().nullable(),
  capacity: z.number().int().nullable(),
  joinPolicy: z.preprocess((value) => value ?? 'OPEN', MeetupJoinPolicySchema),
  participantCount: z.preprocess((value) => value ?? 0, z.number().int()),
  myParticipation: z.preprocess((value) => value ?? 'NONE', MeetupParticipationSchema),
  host: MeetupHostSchema.nullable().optional(),
  canManage: z.preprocess((value) => value ?? false, z.boolean()),
  createdAt: z.string(),
});

export type CrewMeetup = z.infer<typeof CrewMeetupSchema>;

export const CrewMemberPreviewSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
  role: CrewMemberRoleSchema,
});

export type CrewMemberPreview = z.infer<typeof CrewMemberPreviewSchema>;

export const CrewItemSchema = z.object({
  extId: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  region: z.string().nullable(),
  homeGym: CrewHomeGymSchema.nullable(),
  imageMediaId: z.number().int().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  levelBand: CrewLevelBandSchema,
  style: CrewStyleSchema,
  memberCount: z.number().int(),
  capacity: z.number().int().nullable(),
  joinPolicy: CrewJoinPolicySchema,
  myStatus: CrewMyStatusSchema,
  nextMeetup: CrewMeetupSchema.nullable().optional(),
  memberPreview: z.array(CrewMemberPreviewSchema).optional(),
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

export const CreateCrewBodySchema = z.object({
  name: z.string().min(2).max(30),
  summary: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  homeGymExtId: z.string().length(26).nullable().optional(),
  imageMediaId: z.number().int().nullable().optional(),
  levelBand: CrewLevelBandSchema.nullable().optional(),
  style: CrewStyleSchema.nullable().optional(),
  capacity: z.number().int().min(2).max(200).nullable().optional(),
});

export type CreateCrewBody = z.infer<typeof CreateCrewBodySchema>;

export const UpdateCrewBodySchema = CreateCrewBodySchema.partial().extend({
  clearHomeGym: z.boolean().optional(),
  clearImage: z.boolean().optional(),
  clearCapacity: z.boolean().optional(),
});

export type UpdateCrewBody = z.infer<typeof UpdateCrewBodySchema>;

export const CreateCrewJoinRequestBodySchema = z.object({
  message: z.string().max(500).nullable().optional(),
});

export type CreateCrewJoinRequestBody = z.infer<typeof CreateCrewJoinRequestBodySchema>;

export const CrewApplicantSchema = z.object({
  extId: z.string(),
  nickname: z.string().nullable(),
});

export type CrewApplicant = z.infer<typeof CrewApplicantSchema>;

export const CrewJoinRequestSchema = z.object({
  extId: z.string(),
  crewExtId: z.string(),
  applicant: CrewApplicantSchema,
  message: z.string().nullable(),
  status: CrewJoinRequestStatusSchema,
  decidedBy: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type CrewJoinRequest = z.infer<typeof CrewJoinRequestSchema>;

export const CrewJoinRequestItemSchema = CrewJoinRequestSchema.omit({ crewExtId: true });

export type CrewJoinRequestItem = z.infer<typeof CrewJoinRequestItemSchema>;

export const CrewJoinRequestListSchema = z.object({
  items: z.array(CrewJoinRequestItemSchema),
  page: CrewPageSchema,
});

export type CrewJoinRequestList = z.infer<typeof CrewJoinRequestListSchema>;

export const CrewMemberSchema = z.object({
  userExtId: z.string(),
  nickname: z.string().nullable(),
  role: CrewMemberRoleSchema,
  joinedAt: z.string(),
});

export type CrewMember = z.infer<typeof CrewMemberSchema>;

export const CrewMemberListSchema = z.object({
  items: z.array(CrewMemberSchema),
  page: CrewPageSchema,
});

export type CrewMemberList = z.infer<typeof CrewMemberListSchema>;

export const CrewMeetupListSchema = z.object({
  items: z.array(CrewMeetupSchema),
});

export type CrewMeetupList = z.infer<typeof CrewMeetupListSchema>;

export const CreateCrewMeetupBodySchema = z.object({
  title: z.string().min(2).max(60),
  description: z.string().max(500).nullable().optional(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  crewExtId: z.string().length(26).nullable().optional(),
  gymExtId: z.string().length(26).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  capacity: z.number().int().min(2).max(200).nullable().optional(),
  joinPolicy: MeetupJoinPolicySchema.nullable().optional(),
});

export type CreateCrewMeetupBody = z.infer<typeof CreateCrewMeetupBodySchema>;

export const UpdateCrewMeetupBodySchema = CreateCrewMeetupBodySchema.partial().omit({
  crewExtId: true,
});

export type UpdateCrewMeetupBody = z.infer<typeof UpdateCrewMeetupBodySchema>;

export const JoinMeetupBodySchema = z.object({
  message: z.string().max(500).nullable().optional(),
});

export type JoinMeetupBody = z.infer<typeof JoinMeetupBodySchema>;

export const MeetupParticipantSchema = z.object({
  userExtId: z.string().nullable(),
  nickname: z.string().nullable(),
  status: MeetupParticipantStatusSchema,
  message: z.string().nullable(),
  joinedAt: z.string(),
});

export type MeetupParticipant = z.infer<typeof MeetupParticipantSchema>;

export const MeetupParticipantListSchema = z.object({
  items: z.array(MeetupParticipantSchema),
});

export type MeetupParticipantList = z.infer<typeof MeetupParticipantListSchema>;
