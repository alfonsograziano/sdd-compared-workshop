- source_spec: `_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md`
  summary: Add a unit test that pins the timeline tie rule, where an activity and a comment with the same createdAt keep activity first.
  evidence: The verification-gap reviewer showed that swapping the two spreads in getTimeline flips the order on a tie and no test fails; ties across tables need writes in the same millisecond, so it is rare.
