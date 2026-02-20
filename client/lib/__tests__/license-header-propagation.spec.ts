import { fetchWithAccessHeaders } from "../access-request";
import { useAuthStore } from "../../store/authStore";
import {
  ServerAccessState,
  useServerAccessStore,
} from "../../store/serverAccessStore";

function createResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => ({}),
    text: async () => "",
  } as unknown as Response;
}

describe("license header propagation", () => {
  const originalFetch = global.fetch;

  function readFirstRequestHeaders(fetchMock: jest.Mock): Headers {
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("Expected fetch to be called at least once");
    }

    const init = firstCall[1];
    if (!init || typeof init !== "object") {
      throw new Error("Expected RequestInit in fetch call");
    }

    const requestInit = init as RequestInit;
    return new Headers(requestInit.headers);
  }

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    useServerAccessStore.setState((state: ServerAccessState) => ({
      ...state,
      mode: "hosted",
      hostedUrl: "https://axon-ai.replit.app",
      selfHostedUrl: "",
      licenseKey: "AXON-TEST-KEY",
      deviceId: "device-123",
      isConfigured: true,
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("adds license headers for hosted requests", async () => {
    const fetchMock = jest.fn(async () => createResponse(200));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchWithAccessHeaders("https://example.com/api/test", {
      method: "GET",
    });

    const headers = readFirstRequestHeaders(fetchMock);
    expect(headers.get("X-License-Key")).toBe("AXON-TEST-KEY");
    expect(headers.get("X-Device-Id")).toBe("device-123");
  });

  it("does not add license headers in self-hosted mode", async () => {
    useServerAccessStore.setState((state: ServerAccessState) => ({
      ...state,
      mode: "self_hosted",
      licenseKey: "",
      selfHostedUrl: "http://localhost:5000",
      isConfigured: true,
    }));

    const fetchMock = jest.fn(async () => createResponse(200));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchWithAccessHeaders("https://example.com/api/test", {
      method: "GET",
    });

    const headers = readFirstRequestHeaders(fetchMock);
    expect(headers.get("X-License-Key")).toBeNull();
    expect(headers.get("X-Device-Id")).toBeNull();
  });

  it("propagates hosted headers in auth store refresh flow", async () => {
    useAuthStore.setState((state) => ({
      ...state,
      session: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      },
      isAuthenticated: true,
    }));

    const fetchMock = jest.fn(async () => ({
      ...createResponse(401),
      json: async () => ({
        success: false,
      }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await useAuthStore.getState().refreshSession();

    const headers = readFirstRequestHeaders(fetchMock);
    expect(headers.get("X-License-Key")).toBe("AXON-TEST-KEY");
    expect(headers.get("X-Device-Id")).toBe("device-123");
  });
});
