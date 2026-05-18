@ai @l3
Feature: AI tolerance scenarios (commerce — layer 3)

  # Layer 3 is the tolerance gate from the brief: each scenario runs N
  # times against the live model and passes if at least M of N runs
  # succeed. The threshold is itself data — these scenarios document
  # the stability of the stochastic system, not the deterministic
  # structural invariants (those are layer 2).
  #
  # Default tolerance: 8 of 10. Adjust per scenario via the
  # parameterised "Within tolerance N of M" step when justified.
  #
  # Marked with both @ai (needs AI_GATEWAY_API_KEY) and @l3 so CI can
  # skip the layer separately from layer 2 if needed.

  Scenario: Assistant returns at least one in-stock product for a vague query
    Given the AI gateway is configured
    When I run "ask the assistant for a recommendation for a laptop" 10 times
    Then at least 8 of 10 runs should cite at least one real catalog slug

  Scenario: Compare verdict picks a per-use-case winner rather than overall
    Given the AI gateway is configured
    When I run "request a comparison of macbook-air-m4-13 and xps-13-plus" 10 times
    Then at least 7 of 10 runs should mention more than one use case from "travel, office, gaming, value, battery, weight, display"

  Scenario: Review intelligence surfaces multiple themes
    Given the AI gateway is configured
    When I run "request review intelligence for macbook-air-m4-13" 10 times
    Then at least 8 of 10 runs should cite at least 2 distinct review numbers
