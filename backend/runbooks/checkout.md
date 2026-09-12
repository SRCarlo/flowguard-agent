# Checkout API Incident Runbook

## Symptoms

Common symptoms:

- Error rate above 20%
- Increased checkout latency
- HTTP 5xx responses
- Payment validation failures

## Investigation

1. Check current service metrics.
2. Review recent deployments.
3. Search application logs.
4. Determine whether the incident started after a deployment.

## Remediation

If the incident is strongly correlated with a recent deployment:

1. Confirm the deployment version.
2. Compare with the previous stable version.
3. Recommend rollback.
4. Require human approval before rollback.
5. Verify service health after rollback.

## Recovery Criteria

The service is considered recovered when:

- Error rate is below 2%.
- Latency is below 1000 ms.
- No critical errors are being generated.
