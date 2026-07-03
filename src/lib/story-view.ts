type LookupName = { name: string };

type StoryWithLookups = {
  ageGroupLookup: LookupName;
  genreLookup: LookupName;
  characterGenderLookup: LookupName;
};

export const storyLookupInclude = {
  ageGroupLookup: true,
  genreLookup: true,
  characterGenderLookup: true,
} as const;

export function serializeStory<T extends StoryWithLookups>(story: T) {
  const {
    ageGroupLookup,
    genreLookup,
    characterGenderLookup,
    ...rest
  } = story;

  return {
    ...rest,
    ageGroup: ageGroupLookup.name,
    genre: genreLookup.name,
    characterGender: characterGenderLookup.name,
  };
}

export function storyLookupConnect(input: {
  ageGroup?: string;
  genre?: string;
  characterGender?: string;
}) {
  return {
    ...(input.ageGroup !== undefined
      ? { ageGroupLookup: { connect: { name: input.ageGroup } } }
      : {}),
    ...(input.genre !== undefined
      ? { genreLookup: { connect: { name: input.genre } } }
      : {}),
    ...(input.characterGender !== undefined
      ? { characterGenderLookup: { connect: { name: input.characterGender } } }
      : {}),
  };
}

export function isLookupConnectError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2025",
  );
}
