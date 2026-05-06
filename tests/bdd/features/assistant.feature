Feature: Shopping assistant (commerce — layer 1)

  # The assistant requires a live AI gateway key to actually generate
  # responses, so the layer-1 scenarios here only assert that the page
  # renders, the input is wired up, and the suggestion chips are present.
  # Stochastic-content scenarios live at layer 3.

  Scenario: Assistant page renders with the prompt and input
    Given I visit the assistant page
    Then I should see the assistant input
    And I should see the assistant send button

  Scenario: Assistant page exposes starter suggestions before any messages
    Given I visit the assistant page
    Then I should see at least 3 assistant suggestions

  Scenario: Header has an Ask Joule link
    Given I visit the home page
    Then I should see an Ask Joule nav link
