Feature: Catalog browsing (commerce — layer 1)

  # These scenarios are deterministic. Flakiness here is a bug.
  # Expanded in week 2 once cart + checkout + auth-backed flows land.

  Scenario: Home page renders the hero and featured products
    Given I visit the home page
    Then I should see "Shopping as"
    And I should see at least 4 products in the featured grid

  Scenario: Browsing a category shows its products
    Given I visit the "Laptops" category page
    Then I should see at least 3 products in the product grid
    And every product should be in the "Laptops" category

  Scenario: Product detail page shows name, price, and specs
    Given I visit the product page for "macbook-air-m4-13"
    Then I should see the product name "MacBook Air 13\" (M4)"
    And I should see a price
    And I should see at least 4 spec rows

  Scenario: Searching surfaces matching products
    Given I search for "macbook"
    Then I should see at least 1 product in the product grid
    And the results count should be greater than zero

  Scenario: Searching for nonsense returns no results
    Given I search for "qwertyzzzxxx"
    Then the results count should be zero
    And I should see "No matches"
