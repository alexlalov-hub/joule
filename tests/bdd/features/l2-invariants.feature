@ai
Feature: AI grounding invariants (commerce — layer 2)

  # Layer 2 is the structural gate from the brief: every claim the AI makes
  # must trace to the catalog. These scenarios call live endpoints, parse
  # the response, and assert structural properties — they never assert on
  # specific wording, since that's stochastic.
  #
  # Marked with @ai so CI skips them when AI_GATEWAY_API_KEY is unset; locally
  # they run as part of `npm run test:bdd`.

  Scenario: Every product slug the assistant cites exists in the catalog
    Given the AI gateway is configured
    When I ask the assistant "Recommend a thin laptop under €1500"
    Then every cited product slug should resolve in the catalog

  Scenario: Compare verdict only mentions products that were compared
    Given the AI gateway is configured
    When I request a comparison of "macbook-air-m4-13" and "xps-13-plus"
    Then every cited product slug in the verdict should be one of the inputs

  Scenario: Review-intelligence citations stay within the review range
    Given the AI gateway is configured
    When I request review intelligence for "macbook-air-m4-13"
    Then every citation number should be within the review count
