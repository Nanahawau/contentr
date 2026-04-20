# Contentr — System Architecture

**Version**: 1.4  
**Last Updated**: 2026-04-20  
**Status**: MVP — Active Development

---

## 1. Product Overview

Contentr is a content repurposing platform for creators. A creator uploads a piece of long-form content — video, audio, or text — and Contentr automatically repurposes it into platform-optimised posts for Twitter, LinkedIn, Instagram, TikTok, and others.

The core value proposition is time. A YouTuber with a 30-minute video should not spend 3 hours manually writing captions, threads, and scripts for every platform. Contentr does that in minutes, asynchronously, while the creator does something else.

---

## 2. User Journey

```
Sign Up
  │
  ├── New user receives $5 free credits
  │
  ▼
Dashboard
  │
  ├── Credit balance visible at all times
  ├── If credits are insufficient → redirect to purchase
  │
  ▼
Upload
  │
  ├── Select file (video / audio / text)
  ├── Select target platforms
  ├── System estimates credit cost before confirming
  ├── Credits reserved (not yet deducted)
  │
  ▼
Quality Check (synchronous, fast)
  │
  ├── Pass → proceed, credits confirmed deducted
  ├── Low quality warning → user chooses to proceed or cancel
  └── Hard reject (unreadable / corrupt) → credits released, user notified
  │
  ▼
Async Pipeline
  │
  ├── User receives immediate confirmation
  ├── "You'll be notified by email and in the app when it's ready"
  │
  ▼
Notification
  │
  ├── In-app (WebSocket / SSE)
  └── Email
  │
  ▼
Results
  │
  └── User views, edits, copies, or exports generated content
```

---

## 3. Credits System

### Philosophy

Credits decouple pricing from subscriptions. A creator who posts once a month should not pay the same as one who posts daily. Credits reward usage patterns honestly and lower the barrier to entry with a free starting allowance.

### Credit Value

| Amount Paid | Credits Granted | Effective Rate | Bonus |
|---|---|---|---|
| Free (new user) | 500 | $0.01/credit | — |
| $5 | 500 | $0.01/credit | — |
| $10 | 1,100 | $0.0091/credit | +10% |
| $25 | 3,000 | $0.0083/credit | +20% |
| $50 | 7,000 | $0.0071/credit | +40% |
| $100 | 16,000 | $0.0063/credit | +60% |

Bulk purchases are cheaper per credit. This incentivises higher upfront spend and improves cash flow predictability.

### Credit Cost per Operation

| Operation | Credits | Notes |
|---|---|---|
| Audio/Video transcription | 10 per minute | Rounded up to nearest minute |
| Text ingestion | 5 per 1,000 words | Rounded up |
| Storage fee | 1 per 100MB | Rounded up, charged at upload |
| Content generation per platform | Tiered (see below) | Based on transcript length |

**Generation credit tiers (per platform):**

| Transcript Length | Credits per Platform |
|---|---|
| 0–5 min / ≤750 words | 5 credits |
| 5–30 min / ≤4,500 words | 8 credits |
| 30–60 min / ≤9,000 words | 12 credits |
| 60+ min | 18 credits |

In practice, transcripts longer than ~4,000 words are summarised before being passed to the LLM. This caps input token cost, keeps generation quality consistent (LLMs drift on very long inputs), and allows flat-rate pricing within each tier. The summarisation is transparent — users are not charged separately for it.

**Example — 10-minute video (100MB) to 4 platforms:**  
Transcription: 100 credits + Storage: 1 credit + Generation (5–30 min tier): 32 credits = **133 credits (~$1.33)**  
Our actual cost: ~$0.29 → gross margin ~78%

**Example — 90-minute podcast (500MB) to 4 platforms:**  
Transcription: 900 credits + Storage: 5 credits + Generation (60+ min tier): 72 credits = **977 credits (~$9.77)**  
Our actual cost: ~$1.85 → gross margin ~81%

### Credit Flow (Reserve → Confirm → Refund)

Credits are never deducted speculatively. The flow is:

```
1. RESERVE  — credits held on upload, balance shows as "pending"
2. CONFIRM  — credits deducted permanently on successful completion
3. REFUND   — credits returned in full on failure or user cancellation
```

This prevents users losing credits due to infrastructure failures outside their control. It also mirrors the payment hold pattern used by card networks, which users intuitively understand.

### Subscription Tier (Future)

Once the credit model is validated, introduce optional subscriptions that offer a monthly credit allowance at a discount, plus perks:

| Tier | Monthly Price | Credits/Month | Extras |
|---|---|---|---|
| Free | $0 | 500 (one-time) | — |
| Starter | $15 | 2,000 | Priority queue |
| Pro | $49 | 7,500 | Custom prompts, brand voice |
| Agency | $149 | 25,000 | API access, white-label output |

Unused monthly credits expire. This is intentional — it drives regular usage and prevents liability accumulation.

---

## 4. Supported Input Types

| Type | Formats | Max Size | Notes |
|---|---|---|---|
| Video | mp4, mov, webm | 2 GB | Audio extracted for transcription |
| Audio | mp3, wav, m4a, ogg, aac | 500 MB | Sent directly to transcription |
| Text | txt, pdf, docx, srt, vtt | 10 MB | Bypasses transcription entirely |

Text files bypass the transcription pipeline entirely — the content is read directly and passed to generation. This is both faster and cheaper.

---

## 5. Quality Detection

Quality is checked synchronously before the file enters the async pipeline. A low-quality file that fails mid-pipeline wastes credits and causes a poor user experience.

### Audio / Video Quality

Uses `ffprobe` (bundled with ffmpeg) to extract metadata before any upload or processing occurs:

| Signal | Minimum Threshold | Hard Reject |
|---|---|---|
| Audio bitrate | 64 kbps | Below 32 kbps |
| Sample rate | 16 kHz | Below 8 kHz |
| Duration | 30 seconds | Below 10 seconds |
| Video resolution | 360p | Corrupt/unreadable |
| Background noise ratio | < 60% noise | Warn only |

**Quality score** (1–10) is shown to the user on the upload screen. It is calculated from the above signals and stored with the upload record.

A score of 1–3 triggers a hard reject with a clear message.  
A score of 4–6 triggers a warning: "This file has poor audio quality. Transcription accuracy may be reduced. Proceed?"  
A score of 7–10 proceeds silently.

### Text Quality

| Signal | Check |
|---|---|
| Word count | Minimum 100 words |
| Encoding | Valid UTF-8 |
| Language | Detected and stored; warn if unsupported |
| Readability | Not predominantly symbols or code |

### Why This Matters

A user who uploads a noisy 128kbps podcast recorded on a laptop microphone will get a poor transcript regardless of how good Whisper is. Detecting this upfront and communicating it sets accurate expectations. It also protects our margin — a failed transcription that we refund costs us the API call but earns us nothing.

---

## 6. System Architecture

### High-Level Components

```
Client (Web / Mobile)
        │
        ▼
  NestJS API (REST)
        │
   ┌────┴──────────────────────────────────────┐
   │                                           │
   ▼                                           ▼
MongoDB                                     Redis
(persistent data)                        (queues + cache)
   │                                           │
   │                              ┌────────────┤
   │                              ▼            ▼
   │                        Quality       BullMQ Workers
   │                        Service       ┌───────────────┐
   │                              │       │ Transcription │
   │                              │       │ Consumer      │
   │                              │       ├───────────────┤
   │                              │       │ Content       │
   │                              │       │ Consumer      │
   │                              │       ├───────────────┤
   │                              │       │ Notification  │
   │                              │       │ Consumer      │
   │                              │       └───────────────┘
   │                                           │
   ▼                                           ▼
Object Storage                          External APIs
(S3 / MinIO)                    (Whisper, OpenAI, SendGrid)
```

### Processing Pipeline (Detailed)

```
POST /upload
  │
  ├── 1. Validate file type + size (controller layer)
  ├── 2. Estimate credit cost
  ├── 3. Check user has sufficient credits
  ├── 4. Reserve credits
  ├── 5. Run quality check (ffprobe / text analysis)
  │       ├── Hard reject → release credits, return 422
  │       └── Warn → return quality score, await user confirmation
  ├── 6. Hash file for deduplication
  ├── 7. Upload to S3 (if new file)
  ├── 8. Save Upload record to MongoDB
  ├── 9. Enqueue BullMQ flow
  └── 10. Return { uploadId, estimatedMinutes } to client
                    │
  ┌─────────────────┤
  │  ASYNC          │
  │                 ▼
  │  ┌─────────────────────────────┐
  │  │ Child: transcriptionQueue   │  ← skipped for text uploads
  │  │  - fetch from S3            │
  │  │  - call Whisper             │
  │  │  - save Transcription doc   │
  │  │  - return { text, ... }     │
  │  └──────────────┬──────────────┘
  │                 │
  │                 ▼
  │  ┌─────────────────────────────┐
  │  │ Parent: generateContent     │
  │  │  - receive transcript       │
  │  │  - generate per platform    │  ← parallel, not sequential
  │  │    (Promise.all)            │
  │  │  - save Content docs        │
  │  │  - confirm credits          │
  │  └──────────────┬──────────────┘
  │                 │
  │                 ▼
  │  ┌─────────────────────────────┐
  │  │ notificationQueue           │
  │  │  - send email               │
  │  │  - emit WebSocket event     │
  │  └─────────────────────────────┘
  │
  └── On any failure: refund reserved credits, notify user
```

---

## 7. Data Models

### User

```
User {
  email           string (unique, indexed)
  password        string (bcrypt hashed)
  first_name      string
  last_name       string
  verified        boolean
  provider        string           // 'default' | 'google'
  credits         {
    balance        number          // current spendable credits
    reserved       number          // held for in-progress jobs
    lifetime_used  number          // total credits ever used (analytics)
  }
  created_at      Date
  updated_at      Date
}
```

### Upload

```
Upload {
  user_id         string (indexed)
  s3Key           string (indexed)
  hash            string (indexed)   // SHA-256, for deduplication
  original_name   string
  type            string             // 'video' | 'audio' | 'text'
  quality_score   number             // 1–10
  metadata        {
    size           number            // bytes
    mimetype       string
    duration       number            // seconds (audio/video only)
    word_count     number            // text only
    language       string            // detected language code
  }
  status          string             // 'pending' | 'processing' | 'completed' | 'failed'
  job_ids         {
    transcription  string
    generation     string
  }
  credits_reserved  number
  credits_charged   number
  platforms       string[]
  created_at      Date
  updated_at      Date
}
```

### Transcription

```
Transcription {
  upload_id       string (indexed)
  user_id         string (indexed)
  text            string
  language        string
  duration_seconds number
  provider        string             // 'whisper' | 'local-whisper' | 'assemblyai'
  created_at      Date
}
```

### Content

```
Content {
  upload_id       string (indexed)
  user_id         string (indexed)
  platform        string             // 'twitter' | 'linkedin' | 'instagram' | 'tiktok'
  content         string
  provider        string             // 'gpt-4o' | 'llama3' | etc.
  version         number             // supports regeneration history
  created_at      Date
}
```

### CreditTransaction

```
CreditTransaction {
  user_id         string (indexed)
  type            string             // 'purchase' | 'reserve' | 'charge' | 'refund' | 'grant'
  amount          number             // positive = credit, negative = debit
  upload_id       string             // if operation-related
  payment_id      string             // if purchase (Stripe)
  description     string
  created_at      Date
}
```

`CreditTransaction` is append-only. The current balance is always derivable from the sum of all transactions for a user. The `balance` field on `User` is a denormalised cache of this sum for read performance. Any discrepancy is resolved by re-summing the ledger — this is an audit trail, not just a balance counter.

---

## 8. Notification System

Users should never have to poll the app to know if their content is ready.

### In-App (WebSocket / SSE)

Use Server-Sent Events (SSE) over WebSockets for this use case. SSE is unidirectional (server → client), which is all we need, and requires no persistent connection management. It degrades gracefully over HTTP/2.

Events emitted:

```
upload.queued         { uploadId, estimatedMinutes }
upload.transcribing   { uploadId }
upload.generating     { uploadId, platform }
upload.completed      { uploadId, contentIds[] }
upload.failed         { uploadId, reason }
```

### Email

Triggered by the notification consumer on completion or failure.

Templates needed:
- **Processing complete** — links directly to the generated content
- **Processing failed** — explains why, confirms credits refunded
- **Low credits warning** — triggered when balance drops below 100 credits
- **Welcome + free credits** — triggered on registration

#### Provider Abstraction

Email follows the same provider abstraction pattern used for transcription and content generation. The notification consumer depends on an `EMAIL_PROVIDER` injection token — it never imports a concrete implementation directly.

```
IEmailProvider {
  send(options: {
    to:       string
    subject:  string
    template: string     // template name, e.g. 'processing-complete'
    data:     Record<string, any>
  }): Promise<void>
}
```

Two implementations:

**`SmtpEmailProvider`** (used locally and in staging):
Sends via nodemailer over SMTP. In local development this points to **Mailpit** — a Docker container that catches all outgoing emails and exposes a web UI at `http://localhost:8025`. No external accounts or credentials required. In staging it can point to any SMTP relay.

**`ResendEmailProvider`** (production):
Implements the same `IEmailProvider` interface using the Resend SDK. Swapping from local to production is a single config change — `EMAIL_PROVIDER_MODE=resend` — with zero changes to the notification consumer or templates.

The `EMAIL_PROVIDER` token is registered in the notification module, resolved from `EMAIL_PROVIDER_MODE` in the config:

```
EMAIL_PROVIDER_MODE=smtp    → SmtpEmailProvider  (default for local)
EMAIL_PROVIDER_MODE=resend  → ResendEmailProvider
```

#### Local Docker Setup

Add Mailpit to `docker-compose.local.yml`:

```yaml
mailpit:
  image: axllent/mailpit
  ports:
    - '1025:1025'   # SMTP
    - '8025:8025'   # Web UI
```

Set in `.env.local`:

```
EMAIL_PROVIDER_MODE=smtp
SMTP_HOST=mailpit
SMTP_PORT=1025
```

All emails sent during local development are visible at `http://localhost:8025` — rendered exactly as they would appear to a real recipient.

---

## 9. Security

### Authentication

- JWT with short expiry (1 hour access token, 7-day refresh token)
- Refresh token stored httpOnly cookie — not localStorage
- Rotate refresh tokens on each use (refresh token rotation)
- Google OAuth as secondary option

### Authorisation

- Every database query is scoped to `user_id` extracted from the JWT
- No user can access another user's uploads, transcriptions, or content
- File S3 keys include `userId` prefix — enforced at service level, not just query level

### File Uploads

- Validate MIME type at controller (already done)
- Validate file magic bytes (first N bytes) — not just the declared MIME type, which a client can lie about
- Scan for malware using ClamAV or a cloud scanning API before storing to S3
- Files stored private in S3 — no public access
- Presigned URLs with short TTL for any client download requests

### API Security

- Rate limiting: 100 requests / 15 minutes per user (general)
- Upload rate limiting: 10 uploads / hour per user
- Helmet.js for security headers
- CORS configured to known origins only
- Request body size limits enforced at Nginx/load balancer level

### Payment

- Never handle raw card data — all payment through Stripe
- Webhook signature verification on all Stripe events
- Idempotency keys on all credit operations to prevent double-charging

### Secrets

- No credentials in code or `.env` files committed to git
- Production secrets managed via AWS Secrets Manager or equivalent
- Rotate all keys on any suspected exposure

---

## 10. Performance

### Queue Design

- Transcription and content generation are the slowest operations — they must never block the HTTP layer
- All heavy work runs in BullMQ workers, which can be scaled horizontally independently of the API
- Platform content generation runs in parallel (`Promise.all`) — not sequentially

### Caching

- Transcriptions are cached permanently against `upload_id` — if the same file is re-submitted (same hash), the existing transcription is returned without calling Whisper again
- Credit balance is cached on the User document — recalculated from the ledger on discrepancy only
- Redis used for hot data: job status, user session, rate limit counters

### Database

- All foreign key fields indexed
- Compound indexes on frequent query patterns:
  - `{ user_id: 1, created_at: -1 }` — list user's uploads/content by date
  - `{ upload_id: 1, platform: 1 }` — fetch content by upload and platform
  - `{ hash: 1, user_id: 1 }` — deduplication check
- Timestamps on all schemas (`{ timestamps: true }`)
- Pagination on all list endpoints — no unbounded queries

### Storage

- Files upload to S3 asynchronously — the HTTP response does not wait for S3
- S3 lifecycle policy: transition to Glacier after 60 days, delete after 180 days
- Only the transcript text and generated content are kept long-term — the raw media is temporary

---

## 11. Edge Cases

| Scenario | Handling |
|---|---|
| Insufficient credits on upload | Reject before any processing. Show credit balance and purchase link. |
| Credits run out mid-batch | Fail remaining jobs gracefully. Refund reserved credits. Notify user. |
| Duplicate file upload | Reuse existing transcription. Only charge generation credits. |
| File is video but contains no speech | Whisper returns empty string. Refund transcription credits. Notify user. Offer text input instead. |
| Unsupported language detected | Warn user. Continue if they confirm. Store detected language on transcription. |
| Low quality audio (score 1–3) | Hard reject. Release credits. Return clear explanation. |
| File is corrupt or unreadable | Quality check fails. Release credits. Return 422 with explanation. |
| S3 upload fails | Catch error explicitly. Release reserved credits. Do not enqueue jobs. Return 500. |
| Transcription API is down | Job fails. Exponential backoff retry x3. If still failing: refund credits, notify user. |
| LLM API is down | Same as above — retry, then refund and notify. |
| Very long file (>2 hours) | Show cost estimate before confirming. Require explicit credit check. Transcript summarised before LLM generation. |
| Transcript exceeds 4,000 words | Summarise to ~4,000 words before passing to LLM. Store full transcript; only generation input is capped. |
| User deletes account mid-processing | Cancel pending jobs. Cleanup S3 files. Release credits (moot at that point). |
| User has no email verified | Allow upload, but warn that email notification requires verification. |
| Platform not supported | Return 400 immediately at upload time. Do not enqueue. |
| Job times out | BullMQ stalls after configurable timeout. Auto-retry. Log stall for investigation. |
| Duplicate job enqueued (race condition) | Idempotency key based on `uploadId` prevents duplicate job execution. |

---

## 12. Architecture Improvements Over Current State

### 1. Add a Quality Check Step to the Pipeline

Currently there is no quality check. Files go straight from upload to transcription. A corrupt or silent file wastes API credits and produces no useful output. Insert a synchronous quality gate before enqueueing.

### 2. Route by File Type

Text files do not need transcription. Currently all files go through the transcription queue. Add a routing step in the upload service that enqueues text files directly into `generateContentQueue`, bypassing transcription entirely.

### 3. Credit Reservation Before Processing

Currently there is no credit system at all. This needs to be the first addition — without it, the product has no revenue mechanism and no protection against abuse.

### 4. Parallel Platform Generation

Currently platform content is generated sequentially in a `for` loop. Each LLM call takes 2–5 seconds. For 4 platforms that's 8–20 seconds of unnecessary wait. Replace with `Promise.all`.

### 5. Notification Consumer

The `NotificationService` is a stub. Wire it up as a third queue consumer that fires after generation completes. This decouples notification logic from content generation.

### 6. Upload Status Endpoint

Users have no way to check the status of an in-flight upload. Add `GET /upload/:id/status` that returns the current pipeline stage. This also enables frontend polling or progress indicators before the SSE channel is established.

### 7. Move S3 Upload Out of the Request

Currently `upload.service.ts` uploads to S3 synchronously inside the HTTP request. This means the request hangs until S3 responds. Move S3 upload to a worker. The controller should return the `uploadId` immediately after saving the record and enqueueing — before S3 is touched.

---

## 13. Monetisation Strategy

### Primary: Credits (Pay-as-you-go)

Low friction. No commitment. Good for acquisition. Free credits remove the reason not to try.

### Secondary: Subscriptions

Once users understand their usage patterns (after 4–6 weeks), offer subscriptions. The pitch: "You spent $23 last month on credits. Starter plan gives you that for $15."

Subscriptions do two things: increase ARPU and reduce churn by creating switching cost.

### Tertiary: API Access

Agencies and SaaS builders want to repurpose content programmatically. Offer API access (rate-limited by credits) as a Pro/Agency feature. This opens a B2B revenue line without building a separate product.

### Pricing Principles

- Never compete on price alone — compete on output quality and speed
- The free tier is a marketing channel, not a product tier — make it good enough to create word of mouth but limited enough that serious users upgrade
- Transparent per-operation pricing builds trust with creators who are sensitive to unpredictable costs

---

## 14. Market Fit

### Target Users

**Primary**: Solo content creators — YouTubers, podcasters, coaches — who publish 1–4 pieces of long-form content per week and currently spend 2–4 hours manually adapting each piece for social media.

**Secondary**: Social media managers at small agencies (5–20 clients) who need to produce high volumes of platform-specific content without proportional headcount growth.

### Problem Severity

Creators who are already publishing long-form content are the most motivated users. They have already done the hard work (recording, editing). Contentr removes the last mile — distribution copy — which is repetitive and low-creative-value for them.

### Competitive Landscape

| Product | Model | Weakness |
|---|---|---|
| Repurpose.io | Subscription ($25–99/mo) | Automation-only, low quality |
| Opus Clip | Subscription ($9–99/mo) | Video-only, short clips only |
| Descript | Subscription ($12–24/mo) | Editor, not repurposer |
| Castmagic | Subscription ($23–186/mo) | Audio-only |

**Contentr's differentiator**: Supports all content types (video + audio + text), pay-per-use model, and a quality-first pipeline that warns before wasting the user's time and money.

### Growth Strategy

1. **Content creator communities** — Reddit, Twitter/X, YouTube Creator communities. These users talk to each other. If the output quality is genuinely good, they share it.
2. **Free tier as acquisition** — 500 free credits is enough for 4 full uploads. Users can validate the product before paying.
3. **Output as marketing** — Generated content posted on social media can include a subtle "Created with Contentr" attribution (opt-out, not opt-in).

---

## 15. Engineering Principles

**Keep the pipeline observable.** Every job should emit structured logs with `uploadId`, `userId`, `queueName`, and `durationMs`. Without this, debugging production failures is guesswork.

**Reserve before processing.** Never process work that you are not sure will be paid for. The credit reservation step is not optional — it protects both the user and the business.

**Fail loudly, not silently.** The current `uploadToS3` swallows errors and returns `{ success: false }`. Silent failures compound. Every failure should throw, be logged, and be surfaced to the user with a meaningful message.

**Deduplication is a first-class concern.** Transcription is the most expensive operation. A file that has been uploaded before should never be transcribed again. The hash check is already in place — protect it at every entry point.

**Provider abstraction is already correct — keep it.** The `TRANSCRIPTION_PROVIDER` and `CONTENT_PROVIDER` injection tokens are the right pattern. Every external dependency should be behind an interface. This enables local development, testing, and future provider migrations without touching business logic.

**Horizontal scaling should be effortless.** Workers are stateless. S3 is the file system. MongoDB and Redis are the shared state. Adding more worker instances should require no code change — only config.

---

## 16. Feedback System

### Overview

After every completed repurposing job, users are prompted to rate the output. Feedback is non-blocking — it is never required to access results — but it is surfaced prominently in the results view. Over time, aggregated feedback calibrates quality thresholds and informs prompt improvements.

### When Feedback is Collected

Feedback is collected at two points:

1. **Immediately after results are delivered** — the results view shows a rating prompt alongside each generated post
2. **Via email** — the completion email includes a one-click "Was this useful?" link (thumbs up / thumbs down) that submits feedback without requiring a login

### What Users Can Rate

Feedback is split into three tiers, all optional. Users can submit any combination — the form never blocks progress.

**Tier 1 — Output quality (per job):**

| Signal | Input |
|---|---|
| Transcription accuracy | 1–5 stars |
| Transcription comment | Free text (e.g. "missed speaker names") |
| Generated content per platform | Thumbs up / thumbs down |
| Flag for poor output | Checkbox: "This output is unusable" |

Transcription and content ratings are independent. A user may love the transcript but dislike the LinkedIn post.

**Tier 2 — Descriptive experience feedback (general):**

Shown once after the first completed job, then suppressed for 30 days. A short follow-up prompt after the user has seen their results:

- *"What would have made this output better?"* — free text, max 500 chars
- *"How likely are you to use Contentr again?"* — NPS score (0–10)
- *"Which platform output was most useful to you?"* — single select from the platforms used in this job

**Tier 3 — Feature suggestions (product):**

Accessible at any time via a persistent "Suggest a feature" entry point in the dashboard (not tied to any specific upload). Also surfaced as an optional step at the end of Tier 2 if NPS ≥ 8.

- *"What feature would save you the most time?"* — free text, max 1,000 chars
- *"What content type do you wish we supported?"* — multi-select: `[ ] Shorts/Reels  [ ] Blog post  [ ] Newsletter  [ ] Podcast chapters  [ ] Other`
- *"Any other feedback?"* — free text

Tier 3 submissions are not linked to an upload — they belong to the user and are stored separately.

### Data Model

```
Feedback {
  upload_id             string (indexed)
  user_id               string (indexed)

  // Tier 1 — output quality
  transcription_rating  number             // 1–5, optional
  transcription_comment string             // optional
  content_ratings       [
    {
      content_id        string
      platform          string
      rating            number             // 1 = bad, 2 = good
      flagged           boolean            // "unusable" flag
    }
  ]

  // Tier 2 — experience feedback
  experience  {
    what_would_improve  string             // free text, optional
    nps_score           number             // 0–10, optional
    most_useful_platform string            // optional
  }

  created_at            Date
  updated_at            Date
}
```

```
FeatureSuggestion {
  user_id               string (indexed)
  suggestion            string             // free text
  content_types_wanted  string[]           // multi-select values
  other_feedback        string             // optional
  source                string             // 'dashboard' | 'post-nps'
  created_at            Date
}
```

`Feedback` is one document per upload, upserted on re-submission. `FeatureSuggestion` is append-only — each submission creates a new document since suggestions accumulate meaningfully over time.

### How Feedback Is Used

**Quality threshold calibration (Tier 1):**
Aggregate transcription ratings against the `quality_score` on the `Upload` document. If uploads scoring 6–7 consistently receive transcription ratings of 1–2, raise the warning threshold. Periodic offline analysis, not a real-time loop.

**Flagged outputs (Tier 1):**
Any upload where `flagged: true` is surfaced in an internal dashboard for manual review. If the transcript is identifiably poor, issue a credit refund and notify the user.

**Prompt improvement (Tier 1):**
Low-rated platform outputs (rating = 1) are candidates for prompt tuning. The stored `content_id` links back to the exact output and the transcript that produced it.

**Product direction (Tier 2 + 3):**
NPS scores tracked over time give a leading indicator of retention risk. Free-text responses and feature suggestions are reviewed weekly. `FeatureSuggestion.content_types_wanted` is a direct input to the platform roadmap — frequency of a requested type is a signal to prioritise it.

### Pipeline Integration

The notification consumer already fires after generation completes. Add a feedback prompt event to the SSE stream:

```
upload.completed      { uploadId, contentIds[], feedbackToken }
```

`feedbackToken` is a short-lived signed token (JWT, 7-day TTL) that allows unauthenticated feedback submission from the email link. It encodes `{ uploadId, userId }` and is validated server-side before writing the `Feedback` document.

### API Endpoints

```
POST /feedback/:uploadId          — upsert Tier 1 + Tier 2 feedback for an upload
GET  /feedback/:uploadId          — retrieve existing feedback (owner only)
POST /feedback/suggest            — submit a feature suggestion (Tier 3, authenticated)
POST /feedback/suggest/anonymous  — submit via feedbackToken (email link, unauthenticated)
```

`Feedback` is upserted per upload — re-submitting overwrites the previous entry. `FeatureSuggestion` is always appended.

---

## 17. Open Questions

1. **Should credits expire?** Free credits probably should (e.g. 90 days) to prevent dormant liability. Purchased credits should not — users resent expiry on money they spent.

2. **What is the refund policy for completed but unsatisfactory content?** The product generates content but cannot guarantee the creator will like it. This needs a clear ToS position. Consider a one-time "regeneration" at no extra credit cost per upload.

3. **How do we handle very large files?** A 2-hour podcast at high bitrate can be 500MB+. S3 multipart upload and chunked streaming to Whisper need to be scoped and tested. Storage credits (1 per 100MB) cover the S3 cost; the engineering concern is upload reliability, not pricing.

4. **Do we store the raw file indefinitely?** No — S3 lifecycle policy transitions to Glacier after 60 days and deletes after 180 days (see §10). The storage fee charged at upload accounts for this fixed window. Users are not charged for storage beyond 180 days.

5. **What happens when Whisper returns a poor transcript due to audio quality we did not catch?** Addressed in §16 — users can flag unusable output, which triggers a manual review and credit refund. Aggregate feedback against quality scores drives threshold calibration over time.
