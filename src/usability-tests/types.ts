export type UsabilityTestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export interface UsabilityTestMetadata {
  pedal_id?: string;
  route_id?: string;
  notification_id?: string;
  place_id?: string;
  place_name?: string;
  filters?: Record<string, unknown>;
  result_count?: number;
  registered?: boolean;
  signed_in?: boolean;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface UsabilityTestProgressRow {
  id: string;
  user_id: string;
  test_number: number;
  status: UsabilityTestStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  metadata: UsabilityTestMetadata;
}

export interface UsabilityTestSessionRow {
  user_id: string;
  started_at: string;
  finished_at: string | null;
  completed_count: number;
  skipped_count: number;
  updated_at: string;
}

export type UsabilityEvent =
  | { type: "account_registered" }
  | { type: "signed_in" }
  | { type: "pedal_created"; pedalId: string }
  | {
      type: "pedal_filters_used";
      filters: Record<string, unknown>;
      resultCount: number;
    }
  | { type: "pedal_join_requested"; pedalId: string }
  | { type: "pedal_message_sent"; pedalId: string }
  | { type: "pedal_details_viewed"; pedalId: string }
  | { type: "route_created"; routeId: string }
  | { type: "route_favorited"; routeId: string }
  | {
      type: "bike_service_viewed";
      placeId: string;
      placeName?: string;
    }
  | { type: "notification_viewed"; notificationId?: string };

export const EVENT_TEST_NUMBER: Record<UsabilityEvent["type"], number> = {
  account_registered: 1,
  signed_in: 1,
  pedal_created: 2,
  pedal_filters_used: 3,
  pedal_join_requested: 4,
  pedal_message_sent: 5,
  pedal_details_viewed: 6,
  route_created: 7,
  route_favorited: 8,
  bike_service_viewed: 9,
  notification_viewed: 10,
};

export interface TestSessionView {
  rows: UsabilityTestProgressRow[];
  session: UsabilityTestSessionRow;
  currentTestNumber: number | null;
  completedCount: number;
  skippedCount: number;
  finished: boolean;
}

export interface HandleEventResult {
  state: TestSessionView;
  completedTestNumber: number | null;
  alreadyCompleted: boolean;
}
