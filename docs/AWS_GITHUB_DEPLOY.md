# ContextFlow: GitHub → AWS deployment

The final backend path is:

```text
GitHub Actions
  └─ OIDC (no long-lived AWS key)
      └─ Amazon ECR
          └─ AWS Lambda Function URL
              └─ Strands Agents SDK
                  └─ Amazon Bedrock
```

The repository already contains:

- `infra/aws/bootstrap.yml` — one-time AWS resources and GitHub OIDC trust.
- `.github/workflows/deploy-aws-api.yml` — builds, pushes, deploys, health-checks, and performs a real Strands + Bedrock smoke test.
- `apps/api/Dockerfile.lambda` — Lambda container image.
- `apps/api/main.py` — FastAPI locally and Mangum/Lambda in AWS.

## 1. Create the AWS bootstrap stack once

Use AWS region **Asia Pacific (Mumbai) / `ap-south-1`** so it matches the deployment workflow default.

In AWS Console:

1. Open **CloudFormation**.
2. Choose **Create stack → With new resources (standard)**.
3. Choose **Upload a template file**.
4. Upload `infra/aws/bootstrap.yml` from this repository.
5. Stack name: `contextflow-bootstrap`.
6. Parameter `ExistingGitHubOidcProviderArn`:
   - leave it blank if IAM does not already contain an OIDC provider for `token.actions.githubusercontent.com`;
   - if it already exists, open **IAM → Identity providers → token.actions.githubusercontent.com**, copy its ARN, and paste that ARN into the parameter.
7. Keep the remaining defaults.
8. On the review page, acknowledge that CloudFormation will create named IAM resources.
9. Create the stack and wait for `CREATE_COMPLETE`.

The stack creates only the deployment resources ContextFlow needs: the ECR repository, a Lambda execution role with Bedrock invocation permission, and a GitHub deployment role whose trust is restricted to this repository's `main` branch. The trust policy accepts both GitHub's legacy subject form and the immutable owner/repository-ID subject form used by newer repositories.

## 2. Add one GitHub repository variable

After the stack completes:

1. Open the stack's **Outputs** tab.
2. Copy `GitHubDeployRoleArn`.
3. In GitHub, open this repository.
4. Go to **Settings → Secrets and variables → Actions → Variables**.
5. Create a repository variable:

```text
Name:  AWS_DEPLOY_ROLE_ARN
Value: <paste GitHubDeployRoleArn>
```

Do not add an AWS access key or secret key. The workflow uses GitHub OIDC to obtain temporary AWS credentials.

## 3. Confirm Bedrock model access

In **Amazon Bedrock** in `ap-south-1`, verify the account can invoke the model used by the workflow:

```text
global.anthropic.claude-sonnet-4-6
```

If AWS asks for Anthropic model access/use-case information, complete that account-level step before running the deployment workflow.

## 4. Run the deployment

In GitHub:

1. Open **Actions**.
2. Select **Deploy Strands API to AWS**.
3. Choose **Run workflow**.
4. Keep:

```text
AWS region:       ap-south-1
Strands model ID: global.anthropic.claude-sonnet-4-6
```

The workflow must pass all of these stages:

```text
OIDC authentication
ECR login
Lambda image build
ECR push
Lambda create/update
Function URL configuration
GET /health
POST /agent/run   ← real Strands + Bedrock invocation
```

If `/agent/run` fails, the workflow fails rather than pretending the agent is live.

## 5. Copy the generated backend URL into Vercel

At the bottom of the successful GitHub Action run, the **job summary** prints:

```text
CONTEXTFLOW_AGENT_API_URL=https://<lambda-id>.lambda-url.ap-south-1.on.aws/
```

In Vercel, open the `contextflow-agent` project and add that exact value as the Production environment variable:

```text
CONTEXTFLOW_AGENT_API_URL
```

Then redeploy Production. The Next.js `/api/agent/plan` route will proxy to the AWS Lambda Strands API.

## 6. Final proof before recording

The submission should not be recorded until all of the following are true:

```text
GitHub CI                         PASS
Deploy Strands API to AWS         PASS
AWS /health                       200
AWS /agent/run                    2xx with real Strands output
Vercel claim workflow             PLAN_READY
Chrome extension                  PRIVACY KERNEL CONNECTED
Protected values                  filled locally
FastVerify disclosure             BLOCKED
ExpenseHub receipt                TRV-2026-91827
Verifier                          VERIFIED_COMPLETE
Mission Control                   reflects real runtime events
```

The Chrome extension is intentionally the only component that still runs on the demo machine because the privacy boundary is the user's browser itself.
