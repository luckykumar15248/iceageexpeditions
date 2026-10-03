"use client"

import Link from "next/link"
import { useActionState, useState, type FormEvent } from "react"
import { submitCommentAction } from "@/app/(marketing)/blog/actions"
import { Captcha, captchaSatisfied, scrollToCaptcha } from "@/components/ui/captcha"
import { BLOG_LIMITS, initialCommentState, type BlogCommentField } from "@/lib/blog-schema"
import { CAPTCHA_PROMPT } from "@/lib/captcha-config"

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(submitCommentAction, initialCommentState)
  const [captchaPrompt, setCaptchaPrompt] = useState(false)
  const [length, setLength] = useState(0)
  const [seenState, setSeenState] = useState(state)
  if (seenState !== state) {
    setSeenState(state)
    setLength(state.values.body.length)
  }

  function guardCaptcha(event: FormEvent<HTMLFormElement>) {
    if (captchaSatisfied(event.currentTarget)) {
      setCaptchaPrompt(false)
      return
    }
    event.preventDefault()
    setCaptchaPrompt(true)
    scrollToCaptcha(event.currentTarget)
  }

  return (
    <form
      action={action}
      onSubmit={guardCaptcha}
      className="grid gap-5 rounded-3xl border border-line bg-paper p-6 shadow-[0_12px_32px_rgba(26,29,27,0.07)] sm:p-8"
      aria-labelledby="comment-form-heading"
    >
      <div>
        <h3 id="comment-form-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Leave a comment
        </h3>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Comments appear after the team reviews them. Your email is never published. For dates, prices, or permits, use the{" "}
          <Link href="/enquire" className="font-semibold text-alpine-deep underline underline-offset-4">
            enquiry form
          </Link>{" "}
          so ops can reply directly.
        </p>
      </div>

      {state.status === "success" ? (
        <p className="rounded-2xl border border-alpine bg-alpine-soft px-4 py-3 text-base text-ink" role="status">
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="rounded-2xl border border-danger/40 bg-paper px-4 py-3 text-base text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <input type="hidden" name="postId" value={postId} />
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="authorName" defaultValue={state.values.authorName} error={state.fieldErrors.authorName} autoComplete="name" maxLength={BLOG_LIMITS.commentName} />
        <Field
          label="Email"
          name="authorEmail"
          type="email"
          defaultValue={state.values.authorEmail}
          error={state.fieldErrors.authorEmail}
          autoComplete="email"
          maxLength={BLOG_LIMITS.commentEmail}
          hint="Not shown publicly."
        />
      </div>

      <label className="flex flex-col gap-2 text-base font-semibold text-ink">
        Comment
        <textarea
          name="body"
          rows={5}
          required
          minLength={3}
          maxLength={BLOG_LIMITS.commentBody}
          defaultValue={state.values.body}
          onChange={(event) => setLength(event.currentTarget.value.length)}
          aria-invalid={state.fieldErrors.body ? true : undefined}
          aria-describedby={["comment-body-count", state.fieldErrors.body ? "comment-body-error" : ""].filter(Boolean).join(" ")}
          className={`rounded-md border bg-paper px-4 py-3 text-base leading-relaxed font-normal text-ink ${state.fieldErrors.body ? "border-danger" : "border-line"}`}
        />
        <span id="comment-body-count" className="text-sm font-normal text-muted">
          {length.toLocaleString("en-IN")} / {BLOG_LIMITS.commentBody.toLocaleString("en-IN")} characters. Plain text only; links are not clickable.
        </span>
        {state.fieldErrors.body ? (
          <span id="comment-body-error" className="text-base font-normal text-danger" role="alert">
            {state.fieldErrors.body}
          </span>
        ) : null}
      </label>

      <Captcha resetSignal={state} error={captchaPrompt ? CAPTCHA_PROMPT : state.fieldErrors.captcha} />

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-md bg-alpine px-6 text-base font-medium text-white hover:bg-alpine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-alpine disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  error,
  hint,
  type = "text",
  ...props
}: {
  label: string
  name: Exclude<BlogCommentField, "body" | "captcha">
  defaultValue: string
  error?: string
  hint?: string
  type?: string
  autoComplete?: string
  maxLength?: number
}) {
  const hintId = hint ? `${name}-hint` : undefined
  const errorId = error ? `${name}-error` : undefined
  return (
    <label className="flex flex-col gap-2 text-base font-semibold text-ink">
      {label}
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-11 rounded-md border bg-paper px-4 text-base font-normal text-ink ${error ? "border-danger" : "border-line"}`}
        {...props}
      />
      {hint ? (
        <span id={hintId} className="text-sm font-normal text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-base font-normal text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
