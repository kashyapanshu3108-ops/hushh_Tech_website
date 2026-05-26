// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const profileAction = vi.fn();

vi.mock("../src/auth/AuthSessionProvider", () => ({
  useAuthSession: () => ({
    status: "unauthenticated",
    signOut: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useHushhProfileCta", () => ({
  useHushhProfileCta: () => ({
    primaryCTA: {
      text: "Complete Your Hushh Profile",
      action: profileAction,
      loading: false,
    },
  }),
}));

import HushhTechNavDrawer from "../src/components/hushh-tech-nav-drawer/HushhTechNavDrawer";

describe("HushhTechNavDrawer cleanup", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    profileAction.mockClear();
  });

  it("does not expose removed philosophy or KYC links", async () => {
    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(HushhTechNavDrawer, {
            isOpen: true,
            onClose: vi.fn(),
          }),
        ),
      );
    });

    expect(container.textContent).not.toContain("Our Philosophy");
    expect(container.textContent).not.toContain("KYC Studio Alpha");
    expect(container.textContent).toContain("Unlock 300K Coins");
  });

  it("uses the shared profile CTA for Unlock 300K Coins", async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(HushhTechNavDrawer, {
            isOpen: true,
            onClose,
          }),
        ),
      );
    });

    const unlockButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Unlock 300K Coins"),
    );

    await act(async () => {
      unlockButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(profileAction).toHaveBeenCalledTimes(1);
  });
});
