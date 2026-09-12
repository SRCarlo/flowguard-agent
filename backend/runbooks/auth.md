# Authentication API Incident Runbook

## Symptoms

- Login failures
- Token generation failures
- Increased authentication latency

## Investigation

1. Check auth-api metrics.
2. Search authentication logs.
3. Review recent deployments.

## Remediation

If a recent deployment is strongly correlated with the incident:

- Recommend rollback.
- Require human approval.
- Verify recovery.

## Recovery

Confirm:

- Error rate below 2%.
- Login requests succeeding.
- Latency below 1000 ms.
