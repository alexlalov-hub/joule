Feature: Admin access control (admin — layer 1)

  # The admin product-management feature is gated at two layers:
  #   1. SvelteKit route guard at /admin/+layout.server.ts — covered here.
  #   2. Supabase RLS policies on `products` — covered by the unit tests on
  #      src/lib/server/admin/products.ts (RLS denial path translates to
  #      AdminWriteError code 'forbidden').
  #
  # These BDD scenarios exercise the route guard with no authenticated
  # session, which is the case that's safe to run without seeded auth
  # fixtures. The "signed-in customer" and "signed-in admin" cases are
  # covered by the isAdmin() unit tests.

  Scenario: Signed-out visitor hitting /admin is redirected to login
    Given I visit "/admin"
    Then I should be redirected to the login page

  Scenario: Signed-out visitor hitting /admin/products is redirected to login
    Given I visit "/admin/products"
    Then I should be redirected to the login page

  Scenario: Signed-out visitor hitting /admin/reviews is redirected to login
    Given I visit "/admin/reviews"
    Then I should be redirected to the login page
