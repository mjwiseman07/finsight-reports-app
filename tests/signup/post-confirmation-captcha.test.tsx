/**
 * Regression: post-confirmation auto sign-in must pass a Turnstile captchaToken.
 *
 * Track 2.5 Follow-up A. The signup path previously called
 * supabase.auth.signInWithPassword({ email, password }) with no
 * options.captchaToken after email confirmation. Supabase CAPTCHA
 * enforcement returned captcha_failed and blocked signup → confirm →
 * checkout entirely. /signin already passes the token; this suite locks
 * the same contract onto the signup auto-sign-in path.
 *
 * Critical assertion: signInWithPassword is called with
 * options.captchaToken set to the post-confirm Turnstile token — and is
 * NOT called before that token resolves.
 */
// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUp(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams(
      "persona=bookkeeper&plan=review_assist&mode=flat",
    ),
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt ?? ""} />;
  },
}));

type TurnstileProps = {
  onSuccess?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  siteKey?: string;
};

// Captures every mounted Turnstile's onSuccess so the test can fire tokens
// in order: form-submit token first, post-confirm token second.
const turnstileOnSuccessHandlers: Array<(token: string) => void> = [];

vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: TurnstileProps) => {
    if (onSuccess) turnstileOnSuccessHandlers.push(onSuccess);
    return <div data-testid="turnstile-widget" />;
  },
}));

import { SignupPageContent } from "../../app/signup/page";

function fillForm() {
  fireEvent.change(screen.getByLabelText(/First name/i), {
    target: { value: "Trk" },
  });
  fireEvent.change(screen.getByLabelText(/Last name/i), {
    target: { value: "Smoke" },
  });
  fireEvent.change(screen.getByLabelText(/Business name/i), {
    target: { value: "Smoke LLC" },
  });
  fireEvent.change(screen.getByLabelText(/^Email/i), {
    target: { value: "smoke@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^Password/i), {
    target: { value: "Sm0ke!Password9" },
  });
}

describe("signup post-confirmation captcha", () => {
  beforeEach(() => {
    turnstileOnSuccessHandlers.length = 0;
    signInWithPassword.mockReset();
    signUp.mockReset();
    signUp.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "test-site-key");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/api/auth/confirmation-status")) {
          return {
            ok: true,
            json: async () => ({ confirmed: true }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not call signInWithPassword until a fresh post-confirm captcha token resolves, then passes that token", async () => {
    render(<SignupPageContent />);

    // Form-phase Turnstile mounts on first paint.
    await waitFor(() => expect(turnstileOnSuccessHandlers.length).toBeGreaterThan(0));
    const formHandlerCount = turnstileOnSuccessHandlers.length;
    act(() => {
      turnstileOnSuccessHandlers[formHandlerCount - 1]!("form-submit-token");
    });

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /Start Review Assist/i }));

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "smoke@example.com",
          options: expect.objectContaining({ captchaToken: "form-submit-token" }),
        }),
      ),
    );

    // verify_email phase mounts the second Turnstile (handlers accumulate on
    // re-render; take the newest one after the form-phase baseline).
    await waitFor(() =>
      expect(turnstileOnSuccessHandlers.length).toBeGreaterThan(formHandlerCount),
    );

    // Confirmation poll returns confirmed:true immediately (stubbed above).
    // Auto sign-in must still wait for the post-confirm token.
    await waitFor(() =>
      expect(screen.getByText(/Completing security check/i)).toBeInTheDocument(),
    );
    expect(signInWithPassword).not.toHaveBeenCalled();

    act(() => {
      turnstileOnSuccessHandlers[turnstileOnSuccessHandlers.length - 1]!(
        "post-confirm-token",
      );
    });

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledTimes(1));
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "smoke@example.com",
      password: "Sm0ke!Password9",
      options: { captchaToken: "post-confirm-token" },
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Continue to Checkout/i }),
      ).toBeInTheDocument(),
    );
  });
});
