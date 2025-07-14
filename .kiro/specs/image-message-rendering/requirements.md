# Requirements Document

## Introduction

This feature improves the chat message rendering system to better handle image messages. Currently, the system requires text captions for image messages and doesn't properly display images in the chat interface. Additionally, when sending chat history to the AI, old photo messages are being resent unnecessarily. This enhancement will streamline the image messaging experience by removing the caption requirement, displaying images directly in chat, using cached resized images, and optimizing prompt history handling.

## Requirements

### Requirement 1

**User Story:** As a user, I want to send image messages without being required to add text captions, so that I can quickly share receipts and photos without extra typing.

#### Acceptance Criteria

1. WHEN a user selects an image to send THEN the system SHALL allow sending the image without requiring a text caption
2. WHEN a user sends an image without text THEN the system SHALL process the image message successfully
3. WHEN a user sends an image with optional text THEN the system SHALL process both the image and text together

### Requirement 2

**User Story:** As a user, I want to see image messages displayed in the chat interface, so that I can visually confirm what images I've sent and review the conversation context.

#### Acceptance Criteria

1. WHEN an image message is sent THEN the system SHALL display the image in the chat message thread
2. WHEN displaying images in chat THEN the system SHALL use resized images from browser cache for performance
3. WHEN displaying images THEN the system SHALL maintain proper aspect ratio and fit within the chat interface
4. WHEN images are displayed THEN the system SHALL provide visual feedback that distinguishes image messages from text messages

### Requirement 3

**User Story:** As a user, I want the system to efficiently handle chat history with images when communicating with the AI, so that the system performs well and doesn't waste resources resending old images.

#### Acceptance Criteria

1. WHEN sending chat history to the AI THEN the system SHALL replace old image messages with text placeholder "[image]"
2. WHEN processing chat history THEN the system SHALL only send the current/new image to the AI, not historical images
3. WHEN building prompt history THEN the system SHALL maintain conversation context while excluding actual image data from old messages
4. WHEN a conversation contains multiple images THEN the system SHALL handle each image message appropriately in the history context