import { afterEach, describe, expect, it, vi } from "vitest";
import { ClarityService, resetClarityServiceForTests } from "../service";
import { buildClarityIdentifyArgs } from "../privacy";
import type { ClaritySdk } from "../types";
import {
  reportUsabilityActionToClarity,
  reportUsabilityHandleResultToClarity,
} from "../usability-adapter";
import { InMemoryTestProgressRepository } from "@/usability-tests/memory-repository";
import { TestSessionService } from "@/usability-tests/service";

function createSdk(): ClaritySdk & { initCalls: number } {
  const sdk = {
    initCalls: 0,
    init: vi.fn(() => {
      sdk.initCalls += 1;
    }),
    setTag: vi.fn(),
    identify: vi.fn(),
    consentV2: vi.fn(),
    upgrade: vi.fn(),
    event: vi.fn(),
  };
  return sdk;
}

describe("ClarityService", () => {
  afterEach(() => {
    resetClarityServiceForTests(null);
    vi.unstubAllEnvs();
  });

  it("does not initialize when disabled", () => {
    const sdk = createSdk();
    const service = new ClarityService(sdk, {
      enabled: () => false,
      projectId: () => "test-project-id",
      isDev: () => true,
    });
    expect(service.init()).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
    service.trackUsabilityEvent({ type: "pedal_created", pedalId: "p1" });
    expect(sdk.event).not.toHaveBeenCalled();
  });

  it("does not initialize when Project ID is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const sdk = createSdk();
    const service = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "",
      isDev: () => true,
    });
    expect(service.init()).toBe(false);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("initializes once when enabled and configured", () => {
    const sdk = createSdk();
    const service = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "project-from-env",
      isDev: () => false,
    });
    expect(service.init()).toBe(true);
    expect(service.init()).toBe(true);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith("project-from-env");
    expect(service.isInitialized()).toBe(true);
  });

  it("identify sends only a technical id", () => {
    const sdk = createSdk();
    const service = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "abc",
      isDev: () => false,
    });
    service.init();
    const userId = "8f3d2a1c-1111-2222-3333-444444444444";
    service.identifyUser(userId);
    const identify = sdk.identify as ReturnType<typeof vi.fn>;
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledWith(userId);
    expect(JSON.stringify(identify.mock.calls[0])).not.toMatch(/@/);
    expect(JSON.stringify(identify.mock.calls[0])).not.toMatch(/password/i);
    expect(JSON.stringify(identify.mock.calls[0])).not.toMatch(/eyJ/);
  });

  it("rejects identify values that look like email or JWT", () => {
    expect(() => buildClarityIdentifyArgs("user@example.com")).toThrow();
    expect(() =>
      buildClarityIdentifyArgs(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30"
      )
    ).toThrow();
  });

  it("custom events send only the official event name string", () => {
    const sdk = createSdk();
    const service = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "abc",
      isDev: () => false,
    });
    service.init();
    service.trackUsabilityEvent({
      type: "bike_service_viewed",
      placeId: "place-1",
      placeName: "Oficina da Maria",
    });
    const eventFn = sdk.event as ReturnType<typeof vi.fn>;
    expect(eventFn).toHaveBeenCalledWith("bike_service_viewed");
    expect(eventFn.mock.calls[0]).toEqual(["bike_service_viewed"]);
  });
});

describe("Clarity + TestSessionService decoupling", () => {
  afterEach(() => {
    resetClarityServiceForTests(null);
  });

  it("completes tests without calling Clarity", async () => {
    const sdk = createSdk();
    const clarity = new ClarityService(sdk, {
      enabled: () => false,
      projectId: () => "abc",
      isDev: () => false,
    });
    resetClarityServiceForTests(clarity);

    const tests = new TestSessionService(new InMemoryTestProgressRepository());
    await tests.handleEvent("user-1", { type: "account_registered" });
    const signed = await tests.handleEvent("user-1", { type: "signed_in" });
    expect(signed.completedTestNumber).toBe(1);
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.event).not.toHaveBeenCalled();
  });

  it("records a Clarity action for a real event but does not complete the wrong test", async () => {
    const sdk = createSdk();
    const clarity = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "abc",
      isDev: () => false,
    });
    clarity.init();
    resetClarityServiceForTests(clarity);

    const tests = new TestSessionService(new InMemoryTestProgressRepository());
    const event = { type: "pedal_created" as const, pedalId: "p1" };
    reportUsabilityActionToClarity(event);
    const result = await tests.handleEvent("user-1", event);
    reportUsabilityHandleResultToClarity("user-1", result);

    expect(sdk.event).toHaveBeenCalledWith("pedal_created");
    expect(result.completedTestNumber).toBeNull();
    expect(sdk.upgrade).not.toHaveBeenCalled();
  });

  it("records usability_test_completed only after TestSessionService completes a test", async () => {
    const sdk = createSdk();
    const clarity = new ClarityService(sdk, {
      enabled: () => true,
      projectId: () => "abc",
      isDev: () => false,
    });
    clarity.init();
    resetClarityServiceForTests(clarity);

    const tests = new TestSessionService(new InMemoryTestProgressRepository());
    reportUsabilityActionToClarity({ type: "account_registered" });
    const registered = await tests.handleEvent("user-1", {
      type: "account_registered",
    });
    reportUsabilityHandleResultToClarity("user-1", registered);
    expect(registered.completedTestNumber).toBeNull();
    expect(sdk.event).not.toHaveBeenCalledWith("usability_test_completed");

    reportUsabilityActionToClarity({ type: "signed_in" });
    const signed = await tests.handleEvent("user-1", { type: "signed_in" });
    reportUsabilityHandleResultToClarity("user-1", signed);
    expect(signed.completedTestNumber).toBe(1);
    expect(sdk.event).toHaveBeenCalledWith("signed_in");
    expect(sdk.event).toHaveBeenCalledWith("usability_test_completed");
    expect(sdk.upgrade).toHaveBeenCalledWith("usability_test_completed");
    expect(sdk.setTag).toHaveBeenCalledWith("current_test", "create_pedal");
    expect(sdk.setTag).toHaveBeenCalledWith("test_number", "2");
    expect((sdk.identify as ReturnType<typeof vi.fn>).mock.calls.flat()).not.toContain(
      "user@example.com"
    );
  });
});
