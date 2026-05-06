Feature: Product reviews (commerce — layer 1)

  # The seed inserts deterministic reviews for every product, so the reviews
  # section should always render with content on a known PDP.

  Scenario: Product page shows the reviews section
    Given I visit the product page for "macbook-air-m4-13"
    Then I should see the reviews section
    And I should see at least 1 review

  Scenario: Product page shows aspect rating averages
    Given I visit the product page for "macbook-air-m4-13"
    Then I should see the review summary

  Scenario: Signed-out shoppers cannot post a review
    Given I visit the product page for "macbook-air-m4-13"
    Then the review form should not be visible
    And I should see a sign-in prompt in the reviews section

  Scenario: Aggregate rating links to the reviews section
    Given I visit the product page for "macbook-air-m4-13"
    Then the product rating should link to the reviews section
