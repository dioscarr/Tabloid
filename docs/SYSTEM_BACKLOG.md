# Tabloid system backlog

This is the implementation backlog produced by the 2026-08-29 system sweep.
Stories are intentionally small enough to become focused issues and pull
requests. `P0` blocks reliable operation, `P1` completes the control-plane
vertical slices, and `P2` polishes and scales the product. Dependencies are
written as story IDs.

## P0 — make the control plane execute safely

1. **TB-001 — Define operation state machine.** Document shared states,
   transitions, terminal states, and transition ownership for every durable
   operation.
2. **TB-002 — Add operation identifiers.** Give provisioning, workspace,
   deployment, cleanup, and route operations stable IDs.
3. **TB-003 — Add operation event schema.** Persist ordered events with actor,
   request ID, provider, outcome, and redacted evidence.
4. **TB-004 — Add worker job table.** Persist queued, leased, retrying,
   completed, failed, cancelled, and quarantined jobs.
5. **TB-005 — Add worker lease renewal.** Prevent two workers from executing
   one operation concurrently.
6. **TB-006 — Add idempotency replay tests.** Prove unchanged retries return
   the original operation and result.
7. **TB-007 — Add stale lease recovery.** Requeue abandoned jobs after a
   bounded lease timeout.
8. **TB-008 — Add retry policy.** Define provider-specific retryability,
   backoff, jitter, and maximum attempts.
9. **TB-009 — Add quarantine state.** Stop poison jobs and expose operator
   recovery without deleting evidence.
10. **TB-010 — Add cancellation contract.** Allow safe cancellation before
    irreversible provider steps.
11. **TB-011 — Implement GitHub provider.** Use a narrowly scoped App
    installation credential for branch operations.
12. **TB-012 — Validate branch refs server-side.** Reject unsafe, deleted, and
    unauthorized refs before a job is queued.
13. **TB-013 — Implement workflow readiness poller.** Correlate a branch with
    its exact image workflow and digest.
14. **TB-014 — Implement application registration.** Register a created app
    only after branch and image evidence exist.
15. **TB-015 — Implement Podman provider.** Allow only owned resource names and
    approved operations.
16. **TB-016 — Add Podman health verification.** Verify container health from
    inside the private runtime before ready.
17. **TB-017 — Implement Tailscale provider.** Reconcile only owned routes and
    state volumes.
18. **TB-018 — Verify private HTTPS route.** Check hostname, certificate,
    application response, and API health.
19. **TB-019 — Add cleanup ownership checks.** Refuse deletion without matching
    repository, branch, and resource-prefix metadata.
20. **TB-020 — Add cleanup dry run.** Show resources that would be removed
    without changing runtime state.
21. **TB-021 — Add cleanup operation timeline.** Surface each removed or
    retained resource and its reason.
22. **TB-022 — Add worker health endpoint.** Report version, capabilities,
    queue depth, leases, and last successful reconciliation.
23. **TB-023 — Add worker authentication.** Require a rotating server-to-worker
    credential with audience and expiry checks.
24. **TB-024 — Add worker request signing.** Bind a job claim to its operation
    and payload hash.
25. **TB-025 — Add worker structured logs.** Emit JSON with operation and
    request correlation fields.
26. **TB-026 — Add provider timeout boundaries.** Prevent GitHub, Podman, and
    Tailscale calls from hanging a lease.
27. **TB-027 — Add graceful shutdown.** Release or extend leases before worker
    process termination.
28. **TB-028 — Add provisioning end-to-end fixture.** Exercise request through
    ready state using fake providers.
29. **TB-029 — Add provisioning failure matrix.** Cover branch, workflow,
    image, route, and health failures.
30. **TB-030 — Add worker recovery runbook.** Document replay, quarantine,
    cleanup, and rollback commands.

## P0 — identity, authorization, and data correctness

31. **TB-031 — Implement session adapter.** Replace Admin development identity
    with a server-side authenticated session contract.
32. **TB-032 — Implement authentik client.** Read normalized identity and group
    claims without duplicating credentials.
33. **TB-033 — Add session expiry handling.** Preserve safe drafts while
    redirecting expired sessions through reauthentication.
34. **TB-034 — Add MFA policy enforcement.** Require MFA for owner and admin
    actions.
35. **TB-035 — Add owner lockout tests.** Cover deactivation, role replacement,
    group removal, and last-owner recovery.
36. **TB-036 — Add effective-access evaluator.** Resolve direct, inherited, and
    application-specific bindings on the server.
37. **TB-037 — Add access decision audit.** Record actor, target, policy,
    result, and reason for allow or deny.
38. **TB-038 — Add authorization cache invalidation.** Remove stale decisions
    after identity or policy changes.
39. **TB-039 — Add redirect URI validator.** Enforce exact HTTPS origins and
    approved callback paths.
40. **TB-040 — Add secret-reference validation.** Accept opaque references only
    from an allowlisted server-side catalog.
41. **TB-041 — Add audit tamper evidence.** Chain or otherwise detect mutation
    of append-only audit records.
42. **TB-042 — Add audit export authorization.** Restrict exports and redact
    sensitive context.
43. **TB-043 — Add audit retention policy.** Define retention, archival, and
    legal deletion behavior.
44. **TB-044 — Add request correlation.** Propagate request ID through API,
    worker, provider, workflow, and runtime events.
45. **TB-045 — Add persistence locking tests.** Prove serialized writes survive
    concurrent mutation requests.
46. **TB-046 — Add schema versioning.** Migrate JSON persistence safely toward
    the selected durable store.
47. **TB-047 — Add backup and restore.** Back up non-public control-plane data
    and verify a restoration drill.
48. **TB-048 — Add data integrity check.** Detect orphaned operations, apps,
    events, and resource records.
49. **TB-049 — Add rate limits.** Protect login, invitation, access, workspace,
    and provisioning mutations.
50. **TB-050 — Add security regression suite.** Cover origin, CSRF, idempotency,
    resource IDs, shell input, and secret redaction.

## P1 — connect App Gallery, Brain, Admin, and Dashboard

51. **TB-051 — Replace Gallery fixture inventory.** Load governed templates
    from the Admin API with loading and failure states.
52. **TB-052 — Add template capability metadata.** Describe routes, required
    resources, integrations, and supported lifecycle actions.
53. **TB-053 — Add Gallery draft persistence.** Restore an interrupted product
    brief without reusing a completed operation accidentally.
54. **TB-054 — Add Gallery request timeline.** Show accepted versus deployed
    status explicitly.
55. **TB-055 — Add Gallery retry action.** Retry only retryable failures with
    the original safe details and idempotency semantics.
56. **TB-056 — Add Gallery cancel action.** Cancel queued work and explain when
    cancellation is no longer possible.
57. **TB-057 — Add branch naming preview.** Show normalized app and branch
    identities before submission.
58. **TB-058 — Add duplicate identity guidance.** Map reserved and duplicate
    errors to actionable field messages.
59. **TB-059 — Add template deprecation flow.** Prevent new requests while
    preserving existing app lifecycle support.
60. **TB-060 — Add Gallery contract tests.** Cover payload, CSRF, idempotency,
    response states, and safe error rendering.
61. **TB-061 — Add Brain intent operation model.** Track analysis request,
    provider call, decomposition, approval, and failure separately.
62. **TB-062 — Add Brain capability registry.** Expose versioned tools, scopes,
    inputs, outputs, and availability.
63. **TB-063 — Add Brain tool authorization.** Gate every tool by actor,
    application, and operation scope.
64. **TB-064 — Add Brain provider timeout UI.** Explain unavailable analysis
    without losing the original product brief.
65. **TB-065 — Add decomposition validation.** Validate structured JSON against
    a versioned schema before storing draft output.
66. **TB-066 — Add decomposition provenance.** Store model, prompt version,
    request ID, and source context without secrets.
67. **TB-067 — Add human approval flow.** Require explicit approval before an
    analyzed intent becomes an infrastructure operation.
68. **TB-068 — Add Brain-to-Admin command contract.** Send approved commands
    through Admin rather than allowing Brain provider access.
69. **TB-069 — Add Brain operation preview.** Show affected apps, branches,
    resources, and rollback before execution.
70. **TB-070 — Add Brain contract tests.** Cover capability discovery, denial,
    malformed output, timeout, and redaction.
71. **TB-071 — Replace Admin overview fixtures.** Read metrics from API
    projections with timestamps and stale indicators.
72. **TB-072 — Connect Admin users table.** Add server pagination, filtering,
    activation, and session revocation.
73. **TB-073 — Connect Admin applications table.** Show registered status,
    route, image, health, and last operation.
74. **TB-074 — Connect Admin audit timeline.** Support URL-shareable filters,
    pagination, and event details.
75. **TB-075 — Connect Admin workspace view.** Show desired state, runtime
    state, events, expiry, and owner.
76. **TB-076 — Add Admin operation center.** Aggregate app, workspace,
    deployment, and cleanup operations by status.
77. **TB-077 — Add operator replay controls.** Authorize replay and display
    the exact operation version being replayed.
78. **TB-078 — Add operator quarantine controls.** Require confirmation and
    preserve evidence when releasing a job.
79. **TB-079 — Add stale-data banner.** Distinguish cached projections from
    live provider verification.
80. **TB-080 — Add Admin API client module.** Centralize fetch, CSRF,
    request-ID, error, and session-expiry behavior.
81. **TB-081 — Replace Dashboard fixtures.** Load app and deployment metrics
    from a read-only projection API.
82. **TB-082 — Add Dashboard app drilldown.** Link metrics to operation,
    audit, branch, and route evidence.
83. **TB-083 — Add deployment timeline.** Correlate commit, workflow, image,
    container, route, and health transitions.
84. **TB-084 — Add Dashboard degraded mode.** Show last-known data age and
    provider availability separately.
85. **TB-085 — Add Dashboard filters.** Filter by app, branch, owner, status,
    and time window with URL state.
86. **TB-086 — Add Dashboard authorization.** Enforce read scopes per app and
    redact private infrastructure details.
87. **TB-087 — Add Dashboard API contract.** Version response shapes and
    pagination before connecting the UI.
88. **TB-088 — Add cross-app operation links.** Link one operation across
    Gallery, Admin, Brain, Dashboard, and the launcher.
89. **TB-089 — Add cross-app notification feed.** Publish actionable state
    changes without leaking secret context.
90. **TB-090 — Add cross-app search.** Search apps, branches, operations,
    workspaces, and audit IDs under authorization.

## P1 — workspaces, previews, and lifecycle

91. **TB-091 — Implement workspace job consumer.** Turn queued desired state
    into a constrained runtime operation.
92. **TB-092 — Add workspace resource profiles.** Enforce CPU, memory, process,
    disk, and network limits.
93. **TB-093 — Add workspace volume lifecycle.** Create, reuse, archive, and
    delete isolated storage with ownership metadata.
94. **TB-094 — Add short-lived clone credentials.** Issue, use, revoke, and
    audit a narrowly scoped GitHub credential.
95. **TB-095 — Add workspace environment allowlist.** Generate public branch
    configuration while keeping secrets out of `.env.local`.
96. **TB-096 — Add code-server readiness.** Verify internal health and private
    HTTPS before marking a workspace ready.
97. **TB-097 — Add workspace start/stop idempotency.** Make repeated lifecycle
    requests converge on the same desired state.
98. **TB-098 — Add workspace expiry scheduler.** Stop expired workspaces and
    notify owners before retention decisions.
99. **TB-099 — Add workspace archive flow.** Preserve metadata and selectable
    storage retention after stop.
100. **TB-100 — Add workspace delete confirmation.** Explain irreversible data
     loss and require an explicit typed confirmation.
101. **TB-101 — Add preview reconciliation report.** Compare desired branch
     previews with live containers, routes, and images.
102. **TB-102 — Add preview drift repair.** Repair only owned drift and record
     every action.
103. **TB-103 — Add image retention policy.** Remove unused owned images while
     retaining rollback digests.
104. **TB-104 — Add route collision detection.** Refuse a hostname claimed by a
     different branch or application.
105. **TB-105 — Add route certificate checks.** Alert on missing, expired, or
     mismatched private certificates.
106. **TB-106 — Add preview smoke tests.** Check HTML, static assets, API
     health, launcher contract, and private routing.
107. **TB-107 — Add deployment rollback.** Repoint a preview to the last known
     good image with an audited confirmation.
108. **TB-108 — Add branch deletion guard.** Require merged/approved state,
     ownership, and explicit confirmation before deletion.
109. **TB-109 — Add branch cleanup report.** List containers, networks, volumes,
     images, routes, and retained resources.
110. **TB-110 — Add Windows worker install check.** Verify scheduled task,
     identity, endpoint, permissions, and version.

## P2 — polish, parity, and scale

111. **TB-111 — Finish shared launcher parity.** Apply the Vibe helper and
     complete fallback controls independently to every maintained branch.
112. **TB-112 — Add launcher discovery cache.** Cache successful branch data
     with bounded age and visible refresh state.
113. **TB-113 — Add launcher retry action.** Retry discovery without rebuilding
     or losing the current menu state.
114. **TB-114 — Add launcher accessibility pass.** Verify keyboard navigation,
     focus restoration, labels, and reduced motion in every app.
115. **TB-115 — Add launcher visual contract.** Keep logos and branding
     branch-specific while standardizing interaction and status semantics.
116. **TB-116 — Add shared frontend package plan.** Define versioning and
     release ownership without collapsing independent product repositories.
117. **TB-117 — Add responsive Admin pass.** Verify 320, 768, 1280, and 1536
     pixel layouts for every control-plane workflow.
118. **TB-118 — Add keyboard workflow suite.** Exercise dialogs, tables,
     drawers, menus, and asynchronous announcements.
119. **TB-119 — Remove invented health claims.** Replace static healthy labels
     with timestamped API-backed status and unknown states.
120. **TB-120 — Add release readiness dashboard.** Gate publishing on contract,
     build, security, smoke, route, and rollback evidence.
