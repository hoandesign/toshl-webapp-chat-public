import { describe, it, expect, vi, beforeEach, fail } from 'vitest';
import { handleProcessUserRequestApi } from '../components/chat/apiHandler';
import { Message } from '../components/chat/types';
import * as STRINGS from '../constants/strings';
import { encryptApiKey } from '../utils/encryption';

// Mock the external dependencies
vi.mock('../lib/gemini', () => ({
  processUserRequestViaGemini: vi.fn(),
}));

vi.mock('../lib/toshl', () => ({
  addToshlEntry: vi.fn(),
  fetchEntries: vi.fn(),
  deleteToshlEntry: vi.fn(),
  editToshlEntry: vi.fn(),
  fetchEntryById: vi.fn(),
  fetchToshlBudgets: vi.fn(),
  getToshlDebugRequests: vi.fn(() => []),
  addDebugRequest: vi.fn(),
}));

describe('API Handler - Image Message Processing', () => {
  const setupLocalStorage = (overrides: Record<string, string | null>) => {
    const defaultStore: Record<string, string | null> = {
      toshlApiKey: encryptApiKey('test-toshl-key'),
      geminiApiKey: encryptApiKey('test-gemini-key'),
      currency: 'USD',
      geminiModel: 'gemini-2.5-flash',
      toshlDataFetched: 'true',
      toshlAccounts: JSON.stringify([{ id: 'acc1', name: 'Test Account', balance: 1000, currency: { code: 'USD' } }]),
      toshlCategories: JSON.stringify([{ id: 'cat1', name: 'Food', type: 'expense' }]),
      toshlTags: JSON.stringify([{ id: 'tag1', name: 'lunch' }]),
    };

    const store = { ...defaultStore, ...overrides };

    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chat history processing with images', () => {
    beforeEach(() => {
      setupLocalStorage({});
    });

    it('should replace old image messages with placeholders in history', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini');
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({ result: { action: 'info', headerText: 'Processed your request' } });

      const messagesWithImages: Message[] = [
        { id: 'msg_1', text: 'Regular message', sender: 'user', type: 'text', status: 'sent', timestamp: new Date(Date.now() - 120000).toISOString() },
        { id: 'msg_2', text: '', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,old-image-data', status: 'sent', timestamp: new Date(Date.now() - 90000).toISOString() },
        { id: 'msg_3', text: 'Message with image', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,another-old-image', status: 'sent', timestamp: new Date(Date.now() - 60000).toISOString() },
        { id: 'msg_4', text: 'Recent message', sender: 'user', type: 'text', status: 'sent', timestamp: new Date(Date.now() - 30000).toISOString() },
      ];

      await handleProcessUserRequestApi('New request', messagesWithImages, null, null, 'data:image/jpeg;base64,current-image-data');

      expect(processUserRequestViaGemini).toHaveBeenCalledWith(
        'test-gemini-key',
        expect.any(String),
        'New request',
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        'USD',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ sender: 'user', text: 'Regular message' }),
          expect.objectContaining({ sender: 'user', text: '[image]' }),
          expect.objectContaining({ sender: 'user', text: 'Message with image [image]' }),
          expect.objectContaining({ sender: 'user', text: 'Recent message' }),
        ]),
        undefined,
        undefined,
        'data:image/jpeg;base64,current-image-data',
        undefined,
        undefined,
        true
      );
    });

    it('should maintain conversation context with system messages', async () => {
        const { processUserRequestViaGemini } = await import('../lib/gemini');
        vi.mocked(processUserRequestViaGemini).mockResolvedValue({ result: { action: 'info', headerText: 'Context maintained' } });

        const messagesWithContext: Message[] = [
          { id: 'msg_1', text: 'Add lunch expense', sender: 'user', type: 'text', status: 'sent', timestamp: new Date(Date.now() - 180000).toISOString() },
          { id: 'msg_2', sender: 'bot', type: 'entry_success', entryData: { id: 'entry_1', amount: 12.5, currency: 'USD', category: 'Food', type: 'Expense', date: '2025-01-14' }, timestamp: new Date(Date.now() - 170000).toISOString() },
          { id: 'msg_3', text: 'System processed your request', sender: 'system', type: 'system_info', status: 'sent', timestamp: new Date(Date.now() - 160000).toISOString() },
          { id: 'msg_4', text: '', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,receipt-image', status: 'sent', timestamp: new Date(Date.now() - 90000).toISOString() },
        ];

        await handleProcessUserRequestApi('Show me recent expenses', messagesWithContext, null, 'entry_1');

        expect(processUserRequestViaGemini).toHaveBeenCalledWith(
          'test-gemini-key',
          'gemini-2.5-flash',
          'Show me recent expenses',
          expect.any(Array),
          expect.any(Array),
          expect.any(Array),
          'USD',
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({ sender: 'user', text: 'Add lunch expense' }),
            expect.objectContaining({ sender: 'bot', text: 'System Info: System processed your request' }),
            expect.objectContaining({ sender: 'user', text: '[image]' }),
          ]),
          undefined,
          'entry_1',
          undefined,
          undefined,
          undefined,
          true
        );
      });

      it('should handle mixed text and image messages correctly', async () => {
        const { processUserRequestViaGemini } = await import('../lib/gemini');
        vi.mocked(processUserRequestViaGemini).mockResolvedValue({
          result: { action: 'add', headerText: 'Adding expense from receipt', payload: { amount: -25.5, currency: { code: 'USD' }, category: 'cat1', account: 'acc1', date: '2025-01-14', desc: 'Lunch from receipt' } },
        });

        const mixedMessages: Message[] = [
          { id: 'msg_1', text: 'Here is my lunch receipt', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,receipt-image-1', status: 'sent', timestamp: new Date(Date.now() - 120000).toISOString() },
          { id: 'msg_2', text: 'And here is another one', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,receipt-image-2', status: 'sent', timestamp: new Date(Date.now() - 90000).toISOString() },
          { id: 'msg_3', text: 'Just text message', sender: 'user', type: 'text', status: 'sent', timestamp: new Date(Date.now() - 60000).toISOString() },
        ];

        await handleProcessUserRequestApi('Process this new receipt', mixedMessages, null, null, 'data:image/jpeg;base64,new-receipt-image');

        expect(processUserRequestViaGemini).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'Process this new receipt',
          expect.any(Array),
          expect.any(Array),
          expect.any(Array),
          expect.any(String),
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({ sender: 'user', text: 'Here is my lunch receipt [image]' }),
            expect.objectContaining({ sender: 'user', text: 'And here is another one [image]' }),
            expect.objectContaining({ sender: 'user', text: 'Just text message' }),
          ]),
          undefined,
          undefined,
          'data:image/jpeg;base64,new-receipt-image',
          undefined,
          undefined,
          true
        );
      });
  });

  describe('Error handling for image processing', () => {
    it('should handle API errors gracefully when processing image messages', async () => {
      setupLocalStorage({});
      const { processUserRequestViaGemini } = await import('../lib/gemini');
      const expectedError = new Error('Gemini API error');
      vi.mocked(processUserRequestViaGemini).mockRejectedValue(expectedError);

      const messagesWithImage: Message[] = [{ id: 'msg_1', text: '', sender: 'user', type: 'text', image: 'data:image/jpeg;base64,test-image', status: 'sent', timestamp: new Date().toISOString() }];

      try {
        await handleProcessUserRequestApi('Process this image', messagesWithImage, null, null, 'data:image/jpeg;base64,current-image');
        fail('Expected handleProcessUserRequestApi to reject');
      } catch (e: any) {
        expect(e).toBeInstanceOf(Object);
        expect(e.messagesToAdd).toBeInstanceOf(Array);
        expect(e.messagesToAdd.length).toBe(1);
        expect(e.messagesToAdd[0].text).toBe(expectedError.message);
        expect(e.messagesToAdd[0].type).toBe('error');
      }
    });

    it('should handle missing API keys', async () => {
      setupLocalStorage({ geminiApiKey: null });
      const messages: Message[] = [];
      try {
        await handleProcessUserRequestApi('Test message', messages, null, null);
        fail('Expected handleProcessUserRequestApi to reject');
      } catch (e: any) {
        expect(e).toBeInstanceOf(Object);
        expect(e.messagesToAdd).toBeInstanceOf(Array);
        expect(e.messagesToAdd.length).toBe(1);
        expect(e.messagesToAdd[0].text).toBe(STRINGS.API_KEYS_NOT_CONFIGURED);
        expect(e.messagesToAdd[0].type).toBe('error');
      }
    });

    it('should handle missing Toshl data', async () => {
      setupLocalStorage({ toshlDataFetched: null });
      const messages: Message[] = [];
      try {
        await handleProcessUserRequestApi('Test message', messages, null, null);
        fail('Expected handleProcessUserRequestApi to reject');
      } catch (e: any) {
        expect(e).toBeInstanceOf(Object);
        expect(e.messagesToAdd).toBeInstanceOf(Array);
        expect(e.messagesToAdd.length).toBe(1);
        expect(e.messagesToAdd[0].text).toBe(STRINGS.TOSHL_DATA_NOT_FETCHED);
        expect(e.messagesToAdd[0].type).toBe('error');
      }
    });
  });

  describe('Image placeholder generation', () => {
    beforeEach(() => {
        setupLocalStorage({});
    });
    it('should generate correct placeholders for different image message types', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini');
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({ result: { action: 'info', headerText: 'Processed' } });

      const testCases = [
        { message: { id: 'msg_1', text: '', sender: 'user' as const, type: 'text' as const, image: 'data:image/jpeg;base64,image-only', status: 'sent' as const, timestamp: new Date().toISOString() }, expectedText: '[image]', expectedHasPlaceholder: true },
        { message: { id: 'msg_2', text: 'Receipt for lunch', sender: 'user' as const, type: 'text' as const, image: 'data:image/jpeg;base64,text-with-image', status: 'sent' as const, timestamp: new Date().toISOString() }, expectedText: 'Receipt for lunch [image]', expectedHasPlaceholder: true },
        { message: { id: 'msg_3', text: 'Just text', sender: 'user' as const, type: 'text' as const, status: 'sent' as const, timestamp: new Date().toISOString() }, expectedText: 'Just text', expectedHasPlaceholder: undefined },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        await handleProcessUserRequestApi('Test request', [testCase.message], null, null);
        expect(processUserRequestViaGemini).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'Test request',
          expect.any(Array),
          expect.any(Array),
          expect.any(Array),
          expect.any(String),
          expect.any(String),
          expect.arrayContaining([expect.objectContaining({ sender: 'user', text: testCase.expectedText, ...(testCase.expectedHasPlaceholder !== undefined && { hasImagePlaceholder: testCase.expectedHasPlaceholder }) })]),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );
      }
    });
  });
});