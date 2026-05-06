Feature: Product comparison (commerce — layer 1)

  # The streamed "verdict" requires the AI gateway and lives at layer 3.
  # These layer-1 scenarios cover only the deterministic part: the
  # spec table that the server renders from real catalog data.

  Scenario: Visiting /compare without slugs shows the empty state
    Given I visit "/compare"
    Then I should see "Pick products to compare"

  Scenario: Comparing two valid products renders the spec table
    Given I visit "/compare?slugs=macbook-air-m4-13,xps-13-plus"
    Then I should see the comparison grid
    And the comparison should list 2 products

  Scenario: Comparing with an unknown slug surfaces a missing-products notice
    Given I visit "/compare?slugs=macbook-air-m4-13,does-not-exist"
    Then I should see the comparison grid
    And I should see the missing-products notice
