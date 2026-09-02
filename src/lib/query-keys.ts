export const queryKeys = {
  all: ["pedalconnect"] as const,
  myPedals: (userId: string) =>
    [...queryKeys.all, "my-pedals", userId] as const,
  pedalDetail: (pedalId: string) =>
    [...queryKeys.all, "pedal-detail", pedalId] as const,
  pedalMessages: (pedalId: string) =>
    [...queryKeys.all, "pedal-messages", pedalId] as const,
  pedalParticipation: (pedalId: string, userId: string) =>
    [...queryKeys.all, "pedal-participation", pedalId, userId] as const,
};
