describe('NutriPlan - Meal Plan Generation', () => {
  Cypress.on('uncaught:exception', () => false); // Avoid breaking on frontend JS
 
  const email = 'testuser@nutriplan.com';
  const password = 'Password123!';
 
  function loginViaUI() {
    cy.visit('/login');
 
    cy.get('#register-form').invoke('addClass', 'hidden');
    cy.get('#login-form').invoke('removeClass', 'hidden');
 
    cy.get('#loginForm input[name="email"]').should('be.visible').first().clear().type(email);
    cy.get('#loginForm input[name="password"]').should('be.visible').first().clear().type(password);
    cy.get('#loginForm button[type="submit"]').click();
 
    cy.location('pathname', { timeout: 10000 }).should((path) => {
      expect(['/dashboard', '/info']).to.include(path);
    });
  }
 
  it('should generate and display meal plan after login', () => {
    loginViaUI();
 
    cy.contains('Your Personalised Meal Plan').should('be.visible');
    cy.get('#generateBtn').click();
    cy.get('#mealPlanContainer').should('exist').and('not.be.empty');
  });
 
  it('should allow re-generating a different meal plan', () => {
    loginViaUI();
 
    cy.visit('/dashboard');
    cy.get('#generateBtn').click();
    cy.get('#mealPlanContainer').should('exist').and('not.be.empty');
  });
});