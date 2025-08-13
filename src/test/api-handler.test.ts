import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleProcessUserRequestApi } from '../components/chat/apiHandler'
import { Message } from '../components/chat/types'
import * as STRINGS from '../constants/strings'

// Mock the external dependencies
vi.mock('../lib/gemini', () => ({
  processUserRequestViaGemini: vi.fn(),
}))

vi.mock('../lib/toshl', () => ({
  addToshlEntry: vi.fn(),
  fetchEntries: vi.fn(),
  deleteToshlEntry: vi.fn(),
  editToshlEntry: vi.fn(),
  fetchEntryById: vi.fn(),
  fetchToshlBudgets: vi.fn(),
  getToshlDebugRequests: vi.fn(() => []), // Mock debug function to return empty array
  addDebugRequest: vi.fn(), // Mock debug function
}))

describe('API Handler - Image Message Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock localStorage with proper implementation
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => {
        const data: Record<string, string> = {
          'toshlApiKey': 'test-toshl-key',
          'geminiApiKey': 'test-gemini-key',
          'currency': 'USD',
          'geminiModel': 'gemini-1.5-flash',
          'toshlDataFetched': 'true',
          'toshlAccounts': JSON.stringify([
            { id: 'acc1', name: 'Test Account', balance: 1000, currency: { code: 'USD' } }
          ]),
          'toshlCategories': JSON.stringify([
            { id: 'cat1', name: 'Food', type: 'expense' }
          ]),
          'toshlTags': JSON.stringify([
            { id: 'tag1', name: 'lunch' }
          ])
        }
        return data[key] || null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
  })

  describe('Chat history processing with images', () => {
    it('should replace old image messages with placeholders in history', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini')
      
      // Mock Gemini API response
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({
        result: {
          action: 'info',
          headerText: 'Processed your request',
        }
      })

      const messagesWithImages: Message[] = [
        {
          id: 'msg_1',
          text: 'Regular message',
          sender: 'user',
          type: 'text',
          status: 'sent',
          timestamp: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: 'msg_2',
          text: '',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,old-image-data',
          status: 'sent',
          timestamp: new Date(Date.now() - 90000).toISOString(),
        },
        {
          id: 'msg_3',
          text: 'Message with image',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,another-old-image',
          status: 'sent',
          timestamp: new Date(Date.now() - 60000).toISOString(),
        },
        {
          id: 'msg_4',
          text: 'Recent message',
          sender: 'user',
          type: 'text',
          status: 'sent',
          timestamp: new Date(Date.now() - 30000).toISOString(),
        },
      ]

      await handleProcessUserRequestApi(
        'New request',
        messagesWithImages,
        null,
        null,
        'data:image/jpeg;base64,current-image-data'
      )

      // Verify that processUserRequestViaGemini was called
      expect(processUserRequestViaGemini).toHaveBeenCalledWith(
        'test-gemini-key',
        expect.any(String), // model
        'New request',
        expect.any(Array), // categories
        expect.any(Array), // tags
        expect.any(Array), // accounts
        'USD',
        expect.any(String), // timezone
        expect.arrayContaining([
          expect.objectContaining({
            sender: 'user',
            text: 'Regular message',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: false,
          }),
          expect.objectContaining({
            sender: 'user',
            text: '[image]', // Old image-only message should become placeholder
            hasAudioPlaceholder: false,
            hasImagePlaceholder: true,
          }),
          expect.objectContaining({
            sender: 'user',
            text: 'Message with image [image]', // Text + image should append placeholder
            hasAudioPlaceholder: false,
            hasImagePlaceholder: true,
          }),
          expect.objectContaining({
            sender: 'user',
            text: 'Recent message',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: false,
          }),
        ]),
        undefined, // lastShowContext
        undefined, // lastSuccessfulEntryId
        'data:image/jpeg;base64,current-image-data', // Only current image data
        undefined, // currentAudio
        undefined, // currentAudioMimeType
        true // captureDebugInfo
      )
    })

    it('should maintain conversation context with system messages', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini')
      
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({
        result: {
          action: 'info',
          headerText: 'Context maintained',
        }
      })

      const messagesWithContext: Message[] = [
        {
          id: 'msg_1',
          text: 'Add lunch expense',
          sender: 'user',
          type: 'text',
          status: 'sent',
          timestamp: new Date(Date.now() - 180000).toISOString(),
        },
        {
          id: 'msg_2',
          sender: 'bot',
          type: 'entry_success',
          entryData: {
            id: 'entry_1',
            amount: 12.50,
            currency: 'USD',
            category: 'Food',
            type: 'Expense',
            date: '2025-01-14',
          },
          timestamp: new Date(Date.now() - 170000).toISOString(),
        },
        {
          id: 'msg_3',
          text: 'System processed your request',
          sender: 'system',
          type: 'system_info',
          status: 'sent',
          timestamp: new Date(Date.now() - 160000).toISOString(),
        },
        {
          id: 'msg_4',
          text: '',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,receipt-image',
          status: 'sent',
          timestamp: new Date(Date.now() - 90000).toISOString(),
        },
      ]

      await handleProcessUserRequestApi(
        'Show me recent expenses',
        messagesWithContext,
        null,
        'entry_1'
      )

      expect(processUserRequestViaGemini).toHaveBeenCalledWith(
        'test-gemini-key',
        'gemini-1.5-flash',
        'Show me recent expenses',
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        'USD',
        expect.any(String), // timezone
        expect.arrayContaining([
          expect.objectContaining({
            sender: 'user',
            text: 'Add lunch expense',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: false,
          }),
          expect.objectContaining({
            sender: 'bot',
            text: 'System Info: System processed your request',
          }),
          expect.objectContaining({
            sender: 'user',
            text: '[image]',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: true,
          }),
        ]),
        undefined,
        'entry_1',
        undefined, // No current image
        undefined, // currentAudio
        undefined, // currentAudioMimeType
        true // captureDebugInfo
      )
    })

    it('should handle mixed text and image messages correctly', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini')
      
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({
        result: {
          action: 'add',
          headerText: 'Adding expense from receipt',
          payload: {
            amount: -25.50,
            currency: { code: 'USD' },
            category: 'cat1',
            account: 'acc1',
            date: '2025-01-14',
            desc: 'Lunch from receipt',
          },
        }
      })

      const mixedMessages: Message[] = [
        {
          id: 'msg_1',
          text: 'Here is my lunch receipt',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,receipt-image-1',
          status: 'sent',
          timestamp: new Date(Date.now() - 120000).toISOString(),
        },
        {
          id: 'msg_2',
          text: 'And here is another one',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,receipt-image-2',
          status: 'sent',
          timestamp: new Date(Date.now() - 90000).toISOString(),
        },
        {
          id: 'msg_3',
          text: 'Just text message',
          sender: 'user',
          type: 'text',
          status: 'sent',
          timestamp: new Date(Date.now() - 60000).toISOString(),
        },
      ]

      await handleProcessUserRequestApi(
        'Process this new receipt',
        mixedMessages,
        null,
        null,
        'data:image/jpeg;base64,new-receipt-image'
      )

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
          expect.objectContaining({
            sender: 'user',
            text: 'Here is my lunch receipt [image]',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: true,
          }),
          expect.objectContaining({
            sender: 'user',
            text: 'And here is another one [image]',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: true,
          }),
          expect.objectContaining({
            sender: 'user',
            text: 'Just text message',
            hasAudioPlaceholder: false,
            hasImagePlaceholder: false,
          }),
        ]),
        undefined,
        undefined,
        'data:image/jpeg;base64,new-receipt-image',
        undefined, // currentAudio
        undefined, // currentAudioMimeType
        true // captureDebugInfo
      )
    })
  })

  describe('Error handling for image processing', () => {
    it('should handle API errors gracefully when processing image messages', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini')
      
      // Mock API to throw error
      vi.mocked(processUserRequestViaGemini).mockRejectedValue(
        new Error('Gemini API error')
      )

      const messagesWithImage: Message[] = [
        {
          id: 'msg_1',
          text: '',
          sender: 'user',
          type: 'text',
          image: 'data:image/jpeg;base64,test-image',
          status: 'sent',
          timestamp: new Date().toISOString(),
        },
      ]

      // Should throw the error (to be handled by the calling component)
      await expect(
        handleProcessUserRequestApi(
          'Process this image',
          messagesWithImage,
          null,
          null,
          'data:image/jpeg;base64,current-image'
        )
      ).rejects.toThrow('Gemini API error')
    })

    it('should handle missing API keys', async () => {
      // Mock localStorage to return null for geminiApiKey
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => {
          if (key === 'geminiApiKey') return null
          const data: Record<string, string> = {
            'toshlApiKey': 'test-toshl-key',
            'currency': 'USD',
            'geminiModel': 'gemini-1.5-flash',
            'toshlDataFetched': 'true',
            'toshlAccounts': JSON.stringify([{ id: 'acc1', name: 'Test Account' }]),
            'toshlCategories': JSON.stringify([{ id: 'cat1', name: 'Food' }]),
            'toshlTags': JSON.stringify([{ id: 'tag1', name: 'lunch' }])
          }
          return data[key] || null
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      })

      const messages: Message[] = []

      await expect(
        handleProcessUserRequestApi(
          'Test message',
          messages,
          null,
          null
        )
      ).rejects.toThrow(STRINGS.API_KEYS_NOT_CONFIGURED)
    })

    it('should handle missing Toshl data', async () => {
      // Mock localStorage to return null for toshlDataFetched
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => {
          if (key === 'toshlDataFetched') return null
          const data: Record<string, string> = {
            'toshlApiKey': 'test-toshl-key',
            'geminiApiKey': 'test-gemini-key',
            'currency': 'USD',
            'geminiModel': 'gemini-1.5-flash',
            'toshlAccounts': JSON.stringify([{ id: 'acc1', name: 'Test Account' }]),
            'toshlCategories': JSON.stringify([{ id: 'cat1', name: 'Food' }]),
            'toshlTags': JSON.stringify([{ id: 'tag1', name: 'lunch' }])
          }
          return data[key] || null
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      }
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      })

      const messages: Message[] = []

      await expect(
        handleProcessUserRequestApi(
          'Test message',
          messages,
          null,
          null
        )
      ).rejects.toThrow(STRINGS.TOSHL_DATA_NOT_FETCHED)
    })
  })

  describe('Image placeholder generation', () => {
    it('should generate correct placeholders for different image message types', async () => {
      const { processUserRequestViaGemini } = await import('../lib/gemini')
      
      vi.mocked(processUserRequestViaGemini).mockResolvedValue({
        result: {
          action: 'info',
          headerText: 'Processed',
        }
      })

      const testCases = [
        {
          message: {
            id: 'msg_1',
            text: '',
            sender: 'user' as const,
            type: 'text' as const,
            image: 'data:image/jpeg;base64,image-only',
            status: 'sent' as const,
            timestamp: new Date().toISOString(),
          },
          expectedText: '[image]',
          expectedHasPlaceholder: true,
        },
        {
          message: {
            id: 'msg_2',
            text: 'Receipt for lunch',
            sender: 'user' as const,
            type: 'text' as const,
            image: 'data:image/jpeg;base64,text-with-image',
            status: 'sent' as const,
            timestamp: new Date().toISOString(),
          },
          expectedText: 'Receipt for lunch [image]',
          expectedHasPlaceholder: true,
        },
        {
          message: {
            id: 'msg_3',
            text: 'Just text',
            sender: 'user' as const,
            type: 'text' as const,
            status: 'sent' as const,
            timestamp: new Date().toISOString(),
          },
          expectedText: 'Just text',
          expectedHasPlaceholder: undefined,
        },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()
        
        await handleProcessUserRequestApi(
          'Test request',
          [testCase.message],
          null,
          null
        )

        expect(processUserRequestViaGemini).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'Test request',
          expect.any(Array),
          expect.any(Array),
          expect.any(Array),
          expect.any(String),
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({
              sender: 'user',
              text: testCase.expectedText,
              hasAudioPlaceholder: false,
              ...(testCase.expectedHasPlaceholder !== undefined && {
                hasImagePlaceholder: testCase.expectedHasPlaceholder,
              }),
            }),
          ]),
          undefined,
          undefined,
          undefined,
          undefined, // currentAudio
          undefined, // currentAudioMimeType
          true // captureDebugInfo
        )
      }
    })
  })
})