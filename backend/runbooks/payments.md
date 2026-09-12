# Payment API Incident Runbook

## Symptoms

- Payment failures
- Increased payment latency
- HTTP 5xx errors

## Investigation

1. Check payment-api metrics.
2. Search payment-api logs.
3. Check external payment provider status.
4. Review recent deployments.

## Remediation

Do not immediately rollback.

First determine whether the issue is internal or caused by an external dependency.

## Recovery

Verify:

- Error rate below 2%.
- Latency below 1000 ms.
- Successful payment requests increasing.
