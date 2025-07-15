import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn(() => ({
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          put: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          delete: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          clear: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          getAll: vi.fn(() => ({ onsuccess: vi.fn(), onerror: vi.fn() })),
          createIndex: vi.fn(),
        })),
      })),
      objectStoreNames: { contains: vi.fn(() => false) },
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn(),
      })),
    },
    onsuccess: vi.fn(),
    onerror: vi.fn(),
    onupgradeneeded: vi.fn(),
  })),
}

// Mock global objects
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
})

// Mock Clipboard API
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(() => Promise.resolve()),
    },
    writable: true,
  })
}

// Mock Image constructor for image processing tests
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 0
  height = 0

  constructor() {
    setTimeout(() => {
      this.width = 800
      this.height = 600
      if (this.onload) this.onload()
    }, 0)
  }
} as unknown as typeof Image

// Mock FileReader for image upload tests
global.FileReader = class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  onerror: (() => void) | null = null
  result: string | ArrayBuffer | null = null

  readAsDataURL() {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,${btoa('mock-image-data')}`
      if (this.onload) {
        this.onload({ target: { result: this.result } })
      }
    }, 0)
  }
  
  static readonly EMPTY = 0
  static readonly LOADING = 1
  static readonly DONE = 2
} as unknown as typeof FileReader

// Mock canvas for image resizing tests
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,mock-resized-image'),
  width: 0,
  height: 0,
}

// Store original createElement
const originalCreateElement = document.createElement.bind(document)

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas
    }
    return originalCreateElement(tagName)
  }),
  writable: true,
})