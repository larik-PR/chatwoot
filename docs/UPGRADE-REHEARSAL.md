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

## Praxis website-widget touchpoints

Recheck these fork-owned widget files after every upstream upgrade:

- `app/javascript/widget/theme/praxis.js` — Praxis palette and mobile widget
  layout classes.
- `app/javascript/widget/views/Messages.vue` — themed conversation surface and
  bounded staff-read-state refresh.
- `app/javascript/widget/components/ChatHeader.vue` — configured practice name,
  avatar, and branded header treatment.
- `app/javascript/widget/components/ChatInputWrap.vue` — recorder placement in
  the existing text and attachment composer.
- `app/javascript/widget/components/PraxisVoiceRecorder.vue` — press-and-hold
  MediaRecorder lifecycle, elapsed time, cancel, and audio attachment handoff.
- `app/javascript/widget/components/PraxisMenuChips.vue` and
  `app/javascript/widget/components/AgentMessageBubble.vue` — namespaced Praxis
  menu-chip rendering and selected-value send.
- `app/javascript/widget/components/AgentMessage.vue`,
  `app/javascript/widget/components/UserMessage.vue`, and
  `app/javascript/widget/components/UserMessageBubble.vue` — message times,
  sent/read ticks, and patient audio playback.
- `app/javascript/widget/store/modules/conversationAttributes.js` and
  `app/views/api/v1/widget/conversations/index.json.jbuilder` — staff last-seen
  state used for patient-visible read receipts.
- `app/javascript/widget/i18n/locale/en.json` and
  `app/javascript/widget/i18n/locale/de.json` — English and German recorder and
  receipt strings.
- `app/javascript/widget/helpers/actionCable.js` and
  `app/javascript/widget/helpers/specs/actionCable.spec.js` — immediate
  staff-read timestamp updates when conversation events are available.
- `app/javascript/widget/components/specs/ChatInputWrap.spec.js`,
  `app/javascript/widget/components/specs/PraxisHeader.spec.js`,
  `app/javascript/widget/components/specs/PraxisMenuChips.spec.js`,
  `app/javascript/widget/components/specs/PraxisMessageMeta.spec.js`,
  `app/javascript/widget/components/specs/PraxisVoiceRecorder.spec.js`, and
  `app/javascript/widget/components/specs/UserMessageAudio.spec.js` — widget
  interaction coverage.
- `app/javascript/widget/components/PreChat/specs/Form.spec.js` — exact Praxis
  identity-field labels and contact-route requirement coverage.
- `app/javascript/widget/store/modules/specs/conversationAttributes/mutations.spec.js`
  — read-state persistence coverage.
- `app/javascript/widget/views/specs/MessagesPraxisTheme.spec.js` and
  `app/javascript/widget/views/specs/__snapshots__/MessagesPraxisTheme.spec.js.snap`
  — theme regression coverage.

The website snippet remains the stock Chatwoot SDK contract. The Bridge adds
`content_attributes.praxis_menu_options` only to website-menu messages; do not
broaden this behavior to Chatwoot's generic `input_select` forms.

## Follow-ups

- **Attachments via bridge** — extend the approved-send contract and composer
  integration before enabling attachments for intercepted inboxes.
