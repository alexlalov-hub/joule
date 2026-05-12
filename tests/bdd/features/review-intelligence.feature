Feature: Review intelligence (commerce — layer 1)

  # The streamed synthesis itself needs the AI gateway and lives at
  # layer 3. These layer-1 scenarios cover only the deterministic
  # surface: the collapsed panel + toggle.

  Scenario: PDP shows the review-intelligence panel collapsed by default
    Given I visit the product page for "macbook-air-m4-13"
    Then the review-intelligence panel should be visible
    And the review-intelligence summary should be collapsed

  Scenario: Review numbers are exposed for citation scrolling
    Given I visit the product page for "macbook-air-m4-13"
    Then each review item should expose its review number
