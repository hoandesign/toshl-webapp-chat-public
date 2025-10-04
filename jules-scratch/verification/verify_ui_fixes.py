from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()

    # --- Desktop Verification ---
    context_pc = browser.new_context()
    page_pc = context_pc.new_page()
    page_pc.goto("http://localhost:5173/")
    page_pc.wait_for_selector('textarea[placeholder*="Type your request"]')
    # Hover over the first message bubble to reveal the action menu
    message_bubble_pc = page_pc.locator('.message-bubble:has-text("How can I help you today")')
    message_bubble_pc.hover()
    page_pc.wait_for_timeout(500) # Wait for animation
    page_pc.screenshot(path="jules-scratch/verification/final_ui_pc.png")

    # --- Mobile Verification ---
    context_mobile = browser.new_context(
        viewport={'width': 375, 'height': 667},
        is_mobile=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
    )
    page_mobile = context_mobile.new_page()
    page_mobile.goto("http://localhost:5173/")
    page_mobile.wait_for_selector('textarea[placeholder*="Type your request"]')
    # On mobile, the hover menu is typically triggered by a tap/click, so we'll simulate that.
    # Since there's no tap-to-show-menu logic implemented, we'll just verify the chat bar icon alignment again.
    page_mobile.screenshot(path="jules-scratch/verification/final_ui_mobile.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)