## Spark Prompt Guide — Build “Legit, Magic” Features

Use this template when asking Copilot (or any AI agent) to design and build ambitious, production-grade features. The clearer and bolder the prompt, the better the output.

### Golden Rule
> AI builds at the level of clarity + ambition you provide.

### Copy-Paste Prompt
```
You are a principal engineer + product architect with 15+ years experience.

Design and build a CRAZY, production-grade app — not a demo.

GOAL:
[What problem does the app solve? Who is it for?]

CORE WOW FACTOR:
[What makes it feel magical / 10x better than others?]

TECH CONSTRAINTS:
- Frontend: [React / Next.js / Mobile / etc]
- Backend: [Node / .NET / Python / Serverless]
- DB: [Postgres / Mongo / Redis]
- Auth: [JWT / OAuth / SSO]
- Infra: [AWS / Azure / GCP]

REQUIREMENTS:
- Clean architecture
- Scalable & modular
- Real-world edge cases
- Error handling
- Security best practices
- Performance considerations

DELIVERABLES (STEP BY STEP):
1) High-level architecture diagram (explain it in text)
2) Data models
3) API contracts
4) Folder structure
5) Core logic implementation
6) One killer feature implemented fully
7) What to build next

IMPORTANT:
- Ask clarifying questions ONLY if absolutely required
- Make strong engineering decisions
- Explain WHY each decision is made
```

### Power Tricks
1. Tell the AI to be opinionated: “Make strong decisions, don’t ask me for every choice.”
2. Force depth: “No placeholders. No TODOs.”
3. Force realism: “Assume 100k users, bad networks, partial failures.”
4. Force iteration: After the first output, ask “Refactor this like it’s going to production in 6 months.”

### Example Prompt
```
Build a next-gen delivery tracking app that feels alive.

Users should see:
- Real-time courier movement
- ETA confidence score
- Smart rerouting when delays happen
- AI-generated delivery updates written in human tone

Make it feel like Uber + Notion + AI assistant.

Use:
- Next.js
- Node.js
- Postgres
- WebSockets
- Map integration

Treat this like a real startup MVP.
```

### Ready-to-use: Delivery Tracking “Feels Alive”
Copy-paste this for a concrete, production-grade brief:
```
You are a principal engineer + product architect with 15+ years experience.

Design and build a next-gen delivery tracking app that feels alive — like Uber + Notion + an AI assistant.

GOAL:
Give customers and ops real-time visibility and proactive updates that inspire trust at scale.

CORE WOW FACTOR:
- Live courier movement on the map
- ETA confidence score with reasons
- Smart rerouting when delays happen
- AI-generated delivery updates in a human tone

TECH CONSTRAINTS:
- Frontend: Next.js
- Backend: Node.js
- DB: Postgres
- Realtime: WebSockets
- Map integration required
- Auth: JWT (adjust as needed)
- Infra: AWS (adjust as needed)

REQUIREMENTS:
- Clean, modular architecture
- Handles flaky networks and partial failures
- Strong security and input validation
- Performance tuned for 100k users

DELIVERABLES (STEP BY STEP):
1) High-level architecture (text diagram)
2) Data models (couriers, orders, routes, events, messages)
3) API contracts (tracking, updates, rerouting)
4) Folder structure
5) Core logic (ETA calc + confidence, reroute engine)
6) Killer feature fully built: AI-generated human-tone updates
7) Next steps for production hardening

IMPORTANT:
- Make strong engineering decisions without asking back
- No placeholders, no TODOs
- Explain WHY each decision is made
```
