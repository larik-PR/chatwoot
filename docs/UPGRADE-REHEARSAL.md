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
