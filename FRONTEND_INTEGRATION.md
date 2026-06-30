# Guest Error-Code Bot — Frontend Integration

For the **pre-login "check your error code"** screen in the THERMORUM mobile app.

A public, no-login AI endpoint that helps a user identify and understand a boiler/AC fault code, in Georgian. Error codes only — it refuses products/orders/prices. No auth, no account, no token.

## Base URL

```
BASE_URL = https://trm-guest-errorbot-production.up.railway.app
```
> This is the permanent production URL. It never changes. No headers, no token needed. Build against a `BASE_URL` constant and you set it exactly once.

## Endpoint: `POST {BASE_URL}/message`

Streams the assistant's answer back as **Server-Sent Events (SSE)**.

### Request (JSON)
```http
POST {BASE_URL}/message
Content-Type: application/json

{ "messages": [ { "role": "user", "content": "GO BF-ზე E-01 ანათებს, რა ვქნა?" } ] }
```

- `messages`: the recent conversation, **1–12 items**, each `{ role: "user" | "assistant", content: string }`. The **last item must be a `user` message**.
- **The server is stateless — it stores nothing.** The app holds the conversation and resends the recent turns each request. For a follow-up (e.g. the bot asked "which model?" and the user replies "GO BF"), append the prior assistant turn + the new user turn to the array and POST the whole short array again.
- Per-message `content` ≤ **2000 chars**. Max **12** messages.

### Response (SSE: `Content-Type: text/event-stream`)
```
event: token
data: {"text":"E-01 "}

event: token
data: {"text":"ნიშნავს ..."}

event: done
data: {}
```
- Concatenate each `token` event's `data.text` in order to build the answer; render incrementally for a streaming feel.
- `event: done` → the answer is complete; close the stream.
- `event: error` `data: {"message":"..."}` → something failed mid-answer; show a generic retry.

### Errors before the stream starts (normal HTTP, NOT SSE)
- `400` `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` — bad request shape (empty/oversized/last-not-user).
- `429` — rate limited (too many requests from this device). Back off and retry.

## Behavior to expect
- Send a code with no device ("E5 ანათებს") → the bot **asks which model**. Show its reply, let the user answer, append to `messages`, POST again.
- Answers are always **Georgian**.
- It only does error codes. Off-topic → a polite refusal pointing to the app login.

## Minimal client recipe (pseudocode)
```ts
const res = await fetch(`${BASE_URL}/message`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
});
// read res.body as a stream; split the text on "\n\n"; for each block:
//   line "event: token" + "data: {json}"  -> append parsed .text to the current bubble
//   "event: done"                         -> finish, close
//   "event: error"                        -> show a retry message
```
React Native: use `fetch` with a streaming body reader, or an SSE/eventsource library that supports POST + custom body. The wire format is plain SSE; nothing Railway- or provider-specific.

## curl (manual test once live)
```bash
curl -N -X POST {BASE_URL}/message -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"GO BF-ზე E-01 ანათებს, რა ვქნა?"}]}'
```

## Health
`GET {BASE_URL}/health` → `{ status, service, build, timestamp }`. Use it to confirm the service is up.

## Stability promise
The URL and this request/response contract are **frozen**. Future improvements (better answers, an optional photo path) happen behind the same URL with the same request and response shapes. Nothing in this document changes on your side.
