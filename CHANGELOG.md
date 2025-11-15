# Changelog

All notable changes to the project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2025-11-15

### Added

- **Optional OpenAI Assistants API support** - Users can now provide their own existing Assistant ID to use Assistants API instead of Chat Completions
- **Refactored API client layer** - Centralized HTTP client with retry logic, error handling, and header management
- **Consistent history management** - Both Chat API and Assistants API now track conversation history
- **Automatic retries for Assistants API** - Same retry logic as Chat API (5 attempts with exponential backoff)
- **Comprehensive documentation** - Multiple guides including quick reference, implementation details, and refactoring analysis

### Changed

- Reorganized API code into cleaner architecture: `api-client.js` for shared utilities
- Simplified `gpt-api.js` by removing retry logic duplication
- Refactored `assistant-api.js` to use centralized HTTP client
- Both APIs now follow identical patterns for consistency

### Fixed

- HTML conversion now centralized and consistent across APIs
- Error handling now uniform across Chat and Assistants APIs

## [0.1.1] - 2023-04-26

### Added

- Initial implementation.
- Public `/?` and whispered `/w gpt` messages to ChatGPT.
- Hide OpenAI API key value in settings.
- ChatGPT model version selection.
- Conversation support by preserving ChatGPT messages context.
  Customizable context length for API usage cost optimization.
- Basic game systems support for D&D 5e, Pathfinder 2e, and Ironsworn.
  Automatic game system detection.
- Customizable ChatGPT prompt.
- HTML formatted ChatGPT responses in the chat log with selectable text.
- Proper OpenAI API error handling and reporting.

[0.1.1]: https://github.com/vizovitin/foundryvtt-ask-chatgpt/releases/tag/0.1.1
