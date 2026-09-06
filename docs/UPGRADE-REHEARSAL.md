# Praxis upgrade rehearsal

The `praxis` branch starts at upstream Chatwoot `v4.17.1` (commit
`b354a9550e1fb59fa537a9c384232cb076213e72`). Rehearse every
upstream upgrade on a disposable copy of production data before updating the
pinned image in `praxis-comms/deploy/chatwoot/compose.yml`.

Pushes to `praxis` build the GX10 ARM64 image at
`ghcr.io/larik-pr/chatwoot:praxis-v4.17.1` and at a commit-specific tag. Deploy
the reviewed digest, not the mutable release tag.

## Prepare

1. Fetch upstream tags and select the next reviewed stable tag.
2. Create `rehearsal/<tag>` from the current `praxis` branch and merge the tag.
3. Record the current application image, database schema version, and volume
   backup identifiers. Keep the encrypted database and storage backups outside
   the rehearsal host.
4. Restore those backups into an isolated Compose project with no public
   tunnel and synthetic credentials. Never use patient contact channels.

## Rehearse

1. Start Postgres and Redis, then run Chatwoot's database preparation command.
2. Start Rails and Sidekiq and wait for both health checks to pass.
3. Confirm an existing staff login, inbox list, conversation list, attachment
   read, and encrypted channel credential can be read without errors.
4. Run the `praxis-comms` Chatwoot smoke script with synthetic data.
5. Exercise the fork's Praxis-specific UI changes and the Bridge webhook,
   human-approval, and send-blocking paths.
6. Review Rails and Sidekiq logs for migration, decryption, retry, or telemetry
   errors without copying message bodies or identifiers into the record.

## Decide and roll back

Record the tested tag, image digest, migration result, smoke result, reviewer,
and duration. Promote only after human approval. A failed rehearsal is rolled
back by stopping the isolated project and restoring its pre-upgrade database
and storage snapshots; never attempt to down-migrate production data.

After approval, update the pinned tag in the infrastructure repository, repeat
the backup, migrate, health, and smoke sequence on the GX10 during a maintenance
window, and retain the prior image and backups until the post-upgrade review is
complete.

## Praxis send-intercept touchpoints

Recheck these fork-owned files after every upstream upgrade:

- `app/javascript/dashboard/api/praxisBridge.js` — signed, idempotent Bridge
  request, short-lived context fetch, and blocking-error normalization.
- `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue` —
  public-send interception for inboxes with `praxis_bridge_send=true`.
- `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  — bridge routing, blocking, context retry, scheduled-send, attachment,
  feature-off, and private-note regression coverage.
- `app/controllers/api/v1/accounts/praxis_bridge_controller.rb` and
  `config/routes.rb` — authenticated, short-lived dashboard context signing.
- `spec/requests/api/v1/accounts/praxis_bridge_context_spec.rb` — context
  authentication and HMAC contract coverage.
- `app/javascript/dashboard/i18n/locale/{de,en}/conversation.json` — bridge
  status and failure messages.

The flag defaults off. Before enabling it, configure the same
`CHATWOOT_DASHBOARD_SECRET` for Chatwoot and the Bridge, verify that the
same-origin proxy forwards the signed headers to the Bridge, and run the
synthetic acceptance checks in the send-intercept runbook. Private notes must
continue through Chatwoot's native message action.

## Fork-owned GitHub Actions policy

After every upstream upgrade, keep only these workflows active in the fork:

- `.github/workflows/publish_praxis_image.yml` — publishes the Praxis CE image
  on pushes to `praxis` and by manual dispatch.
- `.github/workflows/run_foss_spec.yml` — runs CE specs, security checks, and
  backend/frontend lint on pushes to `praxis` and pull requests targeting
  `praxis`.
- `.github/workflows/lint_pr.yml` — validates titles for pull requests targeting
  `praxis`.
- `.github/workflows/size-limit.yml` — runs the secret-free asset size check for
  pull requests targeting `praxis`.

The fork removes these inherited upstream operations workflows; reapply these
removals if an upstream merge restores them:

- `auto-assign-pr.yml`
- `deploy_check.yml`
- `frontend-fe.yml`
- `ghsa-linear-sync.yml`
- `lock.yml`
- `logging_percentage_check.yml`
- `nightly_installer.yml`
- `publish_codespace_image.yml`
- `publish_ee_docker.yml`
- `publish_foss_docker.yml`
- `run_mfa_spec.yml`
- `stale.yml`
- `test_docker_build.yml`

## Follow-ups

- **Attachments via bridge** — extend the approved-send contract and composer
  integration before enabling attachments for intercepted inboxes.
