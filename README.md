# FlowGuard --- AI Incident Commander for Slack

> **From alert to resolution --- without leaving Slack.**

FlowGuard is an AI-powered incident response agent that lives directly
inside Slack. It helps engineering teams move from a production alert to
investigation, evidence-based diagnosis, human-approved remediation,
recovery verification, and an automated incident postmortem without
leaving their operational workflow.

## 🚨 The Problem

During production incidents, engineers often jump between Slack,
monitoring dashboards, logs, deployment history, runbooks, incident
tickets, recovery checks, and postmortem documents.

This creates context switching and slows down incident response.

**FlowGuard brings the incident workflow into Slack.**

## 💡 What FlowGuard Does

FlowGuard acts as an **AI Incident Commander**.

1.  Detects the incident
2.  Understands the incident context
3.  Investigates service metrics
4.  Checks recent deployments
5.  Searches application logs
6.  Reads the relevant runbook
7.  Correlates the evidence
8.  Identifies the likely root cause
9.  Provides a confidence assessment
10. Recommends the safest remediation
11. Requests human approval before risky actions
12. Executes the approved rollback
13. Verifies service recovery
14. Generates an automated incident postmortem
15. Publishes the result back into Slack

> **AI investigates. Humans approve. Automation executes.**

## 🎯 Demo Scenario

**Service:** `checkout-api`

Metric Value

---

Error Rate **42.1%**
Latency **8420 ms**
Failed Requests **\~2400**
CPU **91%**
Memory **78%**
Current Version **v2.14.7**
Previous Stable Version **v2.14.6**

A new deployment of `v2.14.7` happened shortly before the incident.

FlowGuard investigates production metrics, deployment history, error
logs, and the checkout runbook. The evidence strongly correlates the
incident with the recent deployment.

FlowGuard recommends:

```text
Rollback checkout-api
v2.14.7 → v2.14.6
```

The rollback is **not performed automatically**. A human must approve it
in Slack.

After approval:

```text
Rollback
   ↓
Health verification
   ↓
Error rate: 0.8%
Latency: 420ms
   ↓
Service recovered
   ↓
AI-generated postmortem
```

## 🧠 AI Investigation

FlowGuard uses an AI agent with tool calling.

```text
Incident
   ↓
Metrics
   ↓
Deployments
   ↓
Error Logs
   ↓
Runbook
   ↓
Evidence Correlation
   ↓
Root Cause
   ↓
Confidence
   ↓
Recommended Action
```

The final investigation is structured into:

```text
INCIDENT
AFFECTED SERVICE
EVIDENCE
LIKELY ROOT CAUSE
CONFIDENCE
RECOMMENDED ACTION
```

## 🔐 Human-in-the-Loop Safety

FlowGuard intentionally does not allow the AI to autonomously execute a
risky production rollback.

```text
AI detects problem
      ↓
AI investigates
      ↓
AI recommends rollback
      ↓
Human approval required
      ↓
Rollback executed
      ↓
Health verified
```

## 💬 Slack-Native Experience

Example:

```text
🚨 Production Incident Detected

checkout-api

Error Rate: 42.1%
Latency: 8420ms
Version: v2.14.7

FlowGuard is investigating...
```

Then:

```text
🤖 FlowGuard Investigation

Likely Root Cause:
Recent deployment v2.14.7 is strongly correlated
with the increase in checkout failures.

Confidence:
High

Recommended Action:
Rollback v2.14.7 → v2.14.6

⚠️ Human approval required.
```

The responder can approve the remediation directly from Slack.

## 🔄 Complete Workflow

```text
Production Alert
      ↓
FlowGuard AI Agent
      ↓
Metrics Investigation
      ↓
Deployment Analysis
      ↓
Log Investigation
      ↓
Runbook Analysis
      ↓
Evidence Correlation
      ↓
Root Cause + Confidence
      ↓
Human Approval
      ↓
Rollback
      ↓
Health Verification
      ↓
Recovery
      ↓
AI Postmortem
```

## 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │        Slack        │
                         │  Alerts + Approval  │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │ Node.js + TypeScript│
                         │      Express        │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │ FlowGuard AI Agent  │
                         │    Tool Calling     │
                         └──────────┬──────────┘
                                    ↓
                  ┌─────────────────┼─────────────────┐
                  ↓                 ↓                 ↓
             Metrics Tool     Deployment Tool     Logs Tool
                  └─────────────────┼─────────────────┘
                                    ↓
                              Runbook Tool
                                    ↓
                           Evidence Correlation
                                    ↓
                           Root Cause Analysis
                                    ↓
                            Human Approval
                                    ↓
                         Rollback + Health Check
                                    ↓
                             AI Postmortem
```

## 🛠️ Technology Stack

### Backend

- Node.js
- TypeScript
- Express.js
- OpenAI SDK
- Slack Bolt
- Slack Socket Mode

### AI

- **OpenAI API**
- GPT models
- Tool calling
- Agentic investigation
- Structured incident analysis

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- CopilotKit

## 🏆 Hackathon Sponsor Ecosystem

FlowGuard is designed around the hackathon sponsor ecosystem and an
extensible integration architecture.

### OpenAI

Primary AI platform for the Incident Commander and production model
integration.

### OpenRouter

Model-routing layer for experimenting with and switching between
compatible AI models.

### Exa

Search and research layer for retrieving technical documentation,
operational knowledge, and relevant incident context.

### CopilotKit

Agent/frontend integration layer for the FlowGuard command-center
experience.

### Trigger.dev

Planned background workflow and durable task execution layer for
long-running incident workflows.

### Auth0

Planned authentication and authorization layer for secure team access.

### Mozilla

Potential browser and open-web ecosystem integration for operational
research workflows.

### Google Cloud

Planned cloud deployment and production infrastructure integration.

### Ambiguous AI

Hackathon ecosystem integration and agent-oriented tooling
compatibility.

### Slack

The primary operational interface where incidents are detected,
investigated, approved, remediated, and reported.

> **Important:** The architecture is modular so these sponsor
> technologies can be integrated independently without changing the core
> incident-commanding workflow.

## 📁 Project Structure

```text
flowguard-ai/
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   └── incidentCommander.ts
│   │   ├── data/
│   │   │   ├── services.json
│   │   │   ├── metrics.json
│   │   │   ├── logs.json
│   │   │   └── deployments.json
│   │   ├── routes/
│   │   │   ├── agentRoutes.ts
│   │   │   └── demoRoutes.ts
│   │   ├── services/
│   │   │   ├── aiService.ts
│   │   │   ├── incidentState.ts
│   │   │   ├── incidentTimeline.ts
│   │   │   ├── postmortemService.ts
│   │   │   └── slackService.ts
│   │   ├── slack/
│   │   │   ├── incidentMessage.ts
│   │   │   └── slackBot.ts
│   │   ├── tools/
│   │   │   ├── metricsTool.ts
│   │   │   ├── logsTool.ts
│   │   │   ├── deploymentsTool.ts
│   │   │   ├── runbookTool.ts
│   │   │   ├── remediationTool.ts
│   │   │   ├── healthTool.ts
│   │   │   └── resetDemoTool.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   └── package.json
│
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

- Node.js 20+
- npm
- Slack workspace
- OpenAI API key

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔑 Environment Variables

Create `backend/.env`:

```env
PORT=3000

AI_PROVIDER=openai
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
AI_MODEL=YOUR_OPENAI_MODEL

SLACK_BOT_TOKEN=YOUR_SLACK_BOT_TOKEN
SLACK_APP_TOKEN=YOUR_SLACK_APP_TOKEN
SLACK_CHANNEL_ID=YOUR_SLACK_CHANNEL_ID
```

**Never commit API keys to GitHub.**

## 🧪 Demo

Trigger the demo from the FlowGuard dashboard.

Initial state:

```text
checkout-api
v2.14.7
42.1% error rate
8420ms latency
```

After investigation:

```text
Status:
Awaiting Human Approval
```

Approve the rollback from Slack:

```text
v2.14.7 → v2.14.6
```

Recovery:

```text
Error Rate: 0.8%
Latency: 420ms
Status: Healthy
```

FlowGuard then generates and posts the incident postmortem.

## 📊 Incident Command Center

The dashboard provides:

- Current incident
- Service health
- Error rate
- Latency
- AI diagnosis
- Root cause
- Confidence
- Agent activity
- Incident timeline
- Remediation status
- Recovery metrics
- Postmortem status
- Ask FlowGuard interface

## 🤖 Ask FlowGuard

Example questions:

```text
Why is checkout-api failing?
```

```text
What changed recently?
```

```text
Is rollback safe?
```

```text
What is the current recovery status?
```

## 🧩 Agent Tools

### Metrics Tool

Retrieves error rate, latency, request rate, CPU, memory, and service
status.

### Deployment Tool

Retrieves current deployment, previous deployment, timestamps, and
version history.

### Logs Tool

Searches application logs for relevant errors and patterns.

### Runbook Tool

Retrieves the operational runbook for the affected service.

### Rollback Tool

Prepares a rollback recommendation while enforcing human approval.

### Health Tool

Verifies whether the service has recovered after remediation.

## 📝 Automated Postmortem

After successful recovery, FlowGuard generates:

```text
INCIDENT POSTMORTEM

SUMMARY
IMPACT
ROOT CAUSE
EVIDENCE
REMEDIATION
RECOVERY
LESSONS
```

## 🌟 Key Features

- Slack-native incident response
- AI-powered investigation
- Tool-calling agent
- Metrics analysis
- Deployment correlation
- Log investigation
- Runbook awareness
- Evidence-based root cause analysis
- Confidence assessment
- Human approval workflow
- Simulated rollback
- Automated health verification
- Real-time incident timeline
- Incident command center
- Conversational incident assistant
- Automated postmortem generation
- Extensible AI integration architecture

## 🏆 Why FlowGuard?

Traditional incident response often looks like:

```text
Alert
 ↓
Open Dashboard
 ↓
Search Logs
 ↓
Check Deployments
 ↓
Read Runbook
 ↓
Discuss in Slack
 ↓
Decide What to Do
 ↓
Execute Fix
 ↓
Verify Recovery
 ↓
Write Postmortem
```

FlowGuard turns it into:

```text
Incident
 ↓
FlowGuard
 ↓
Investigate
 ↓
Explain
 ↓
Approve
 ↓
Remediate
 ↓
Verify
 ↓
Recover
 ↓
Postmortem
```

**All from one incident workflow.**

## 🚀 Future Improvements

- Real observability integrations
- Kubernetes remediation
- PagerDuty integration
- GitHub deployment correlation
- Jira incident creation
- ServiceNow integration
- Persistent incident storage
- Historical incident search
- Exa-powered technical research
- OpenRouter model routing
- Auth0 authentication
- Trigger.dev background workflows
- Google Cloud deployment
- Production-grade audit logs
- Multi-service dependency graphs
- Historical incident learning

## 🧭 Roadmap

```text
Phase 1 → Slack Incident Demo
       ↓
Phase 2 → AI Tool-Calling Investigation
       ↓
Phase 3 → Human-Approved Remediation
       ↓
Phase 4 → Recovery Verification
       ↓
Phase 5 → Automated Postmortems
       ↓
Phase 6 → Real Observability Integrations
       ↓
Phase 7 → Production Incident Platform
```

## 🛡️ Design Philosophy

### 1. Evidence over Guessing

The AI investigates available signals before making a recommendation.

### 2. Human Control

High-impact production actions require explicit human approval.

### 3. Meet Engineers Where They Work

Incident response should happen inside the workflow engineers already
use.

## 📌 Hackathon Pitch

> **FlowGuard is an AI Incident Commander that lives in Slack. It
> investigates production incidents using metrics, deployments, logs,
> and runbooks, explains the likely root cause, asks a human for
> approval before risky remediation, verifies recovery, and
> automatically generates the postmortem --- turning incident response
> from a fragmented process into one AI-powered workflow.**

## 👤 Author

**Shubham Raut** — [GitHub](https://github.com/SRCarlo)


Repository:

`https://github.com/SRCarlo/flowguard-agent`

## 📄 License

This project is provided for hackathon and educational purposes.

---

## ⭐ FlowGuard

**Detect → Investigate → Explain → Approve → Remediate → Verify →
Recover**

> **From alert to resolution --- without leaving Slack.**
