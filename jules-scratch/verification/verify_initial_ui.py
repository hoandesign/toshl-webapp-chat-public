from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # Listen for console events
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    page.goto("http://localhost:5173/")
    page.wait_for_timeout(2000) # wait 2 seconds
    page.screenshot(path="jules-scratch/verification/initial_ui_pc.png")

    # Emulate mobile
    context_mobile = browser.new_context(
        viewport={'width': 375, 'height': 667},
        is_mobile=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
    )
    page_mobile = context_mobile.new_page()
    page_mobile.on("console", lambda msg: print(f"CONSOLE (mobile): {msg.text}"))

    page_mobile.goto("http://localhost:5173/")
    page_mobile.wait_for_timeout(2000) # wait 2 seconds
    page_mobile.screenshot(path="jules-scratch/verification/initial_ui_mobile.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)