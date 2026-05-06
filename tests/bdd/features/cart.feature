Feature: Cart & checkout gating (commerce — layer 2)

  # Guest cart is deferred. Until then, cart actions are auth-gated and the
  # product page exposes an add-to-cart control instead of a coming-soon stub.

  Scenario: Add-to-cart button is available on product pages
    Given I visit the product page for "macbook-air-m4-13"
    Then the add-to-cart button should be enabled

  Scenario: Wishlist toggle is available on product pages
    Given I visit the product page for "macbook-air-m4-13"
    Then the wishlist toggle should be visible

  Scenario: Visiting the cart while signed out redirects to login
    Given I visit the cart page
    Then I should be redirected to the login page

  Scenario: Header hides the cart badge when empty
    Given I visit the home page
    Then I should not see a cart count badge
