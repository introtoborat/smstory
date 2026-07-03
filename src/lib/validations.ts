import { z } from "zod";

// Story create/accepts any string for enum-like fields; the Settings page
// manages the canonical list. We keep length limits here for sanity.
export const storyCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  ageGroup: z.string().min(1, "Age group is required").max(50),
  genre: z.string().min(1, "Genre is required").max(100),
  characterGender: z.string().min(1, "Character gender is required").max(50),
  tags: z.array(z.string()).optional(),
});

export const storyUpdateSchema = storyCreateSchema.partial();

export const pageCreateSchema = z.object({
  pageNumber: z.number().int().min(1),
  sceneDescription: z.string().max(2000).optional(),
  storyText: z.string().min(1, "Story text is required"),
  imagePrompt: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const pageUpdateSchema = pageCreateSchema.partial().omit({ pageNumber: true });

export const pageReorderSchema = z.object({
  pages: z.array(
    z.object({
      id: z.string(),
      pageNumber: z.number().int().min(1),
    })
  ),
});

export const storySearchSchema = z.object({
  query: z.string().optional(),
  ageGroup: z.string().optional(),
  genre: z.string().optional(),
  characterGender: z.string().optional(),
  pageMin: z.coerce.number().int().min(0).optional(),
  pageMax: z.coerce.number().int().min(0).optional(),
  sortBy: z.enum(["title", "createdAt", "updatedAt", "pageCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) return false;
    return true;
  },
  { message: "Current password is required when changing password", path: ["currentPassword"] }
);

export const draftSaveSchema = z.object({
  storyId: z.string().optional(),
  data: z.string().min(1),
});

// ===== User management schemas =====

export const userInviteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const userUpdateByAdminSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email").optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  status: z.enum(["pending", "active", "inactive"]).optional(),
});

export const activateAccountSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const completePasswordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const userSearchSchema = z.object({
  query: z.string().optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  status: z.enum(["pending", "active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "email", "lastLoginAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const auditSearchSchema = z.object({
  query: z.string().optional(),
  actorId: z.string().optional(),
  targetUserId: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type UserInviteInput = z.infer<typeof userInviteSchema>;
export type UserUpdateByAdminInput = z.infer<typeof userUpdateByAdminSchema>;
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type AuditSearchInput = z.infer<typeof auditSearchSchema>;

// ===== Settings (lookup) schemas =====

const colorRegex = /^#[0-9a-fA-F]{6}$/;

export const genreCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  color: z.string().regex(colorRegex, "Color must be a valid hex (e.g. #6366f1)").optional(),
  order: z.number().int().optional(),
});

export const genreUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(colorRegex).optional(),
  order: z.number().int().optional(),
});

export const ageGroupCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  order: z.number().int().optional(),
});

export const ageGroupUpdateSchema = ageGroupCreateSchema.partial();

export const characterGenderCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  order: z.number().int().optional(),
});

export const characterGenderUpdateSchema = characterGenderCreateSchema.partial();

export type StoryCreateInput = z.infer<typeof storyCreateSchema>;
export type StoryUpdateInput = z.infer<typeof storyUpdateSchema>;
export type PageCreateInput = z.infer<typeof pageCreateSchema>;
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
export type StorySearchInput = z.infer<typeof storySearchSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type GenreCreateInput = z.infer<typeof genreCreateSchema>;
export type GenreUpdateInput = z.infer<typeof genreUpdateSchema>;
export type AgeGroupCreateInput = z.infer<typeof ageGroupCreateSchema>;
export type AgeGroupUpdateInput = z.infer<typeof ageGroupUpdateSchema>;
export type CharacterGenderCreateInput = z.infer<typeof characterGenderCreateSchema>;
export type CharacterGenderUpdateInput = z.infer<typeof characterGenderUpdateSchema>;
