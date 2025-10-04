from playwright.sync_api import sync_playwright, Page, expect

def verify_app(page: Page):
    """
    This test verifies that the welcome screen of the application loads correctly.
    """
    # 1. Arrange: Go to the application's homepage.
    page.goto("http://localhost:5173/")

    # 2. Assert: Check for the welcome heading to ensure the page loaded.
    welcome_heading = page.get_by_role("heading", name="Welcome to Toshl Chat")
    expect(welcome_heading).to_be_visible()

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_app(page)
        browser.close()

if __name__ == "__main__":
    main()