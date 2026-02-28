import { renderHook, act } from '@testing-library/react';
import { useChatLogic } from '../components/chat/useChatLogic';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock other browser APIs used in the hook
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true
});
window.addEventListener = vi.fn();
window.removeEventListener = vi.fn();
window.confirm = vi.fn(() => true);

// Mock initial data in localStorage
localStorage.setItem('toshlAccounts', JSON.stringify([{ id: 'acc1', name: 'Bank' }]));
localStorage.setItem('toshlCategories', JSON.stringify([{ id: 'cat1', name: 'Groceries' }]));
localStorage.setItem('toshlTags', JSON.stringify([{ id: 'tag1', name: 'Urgent' }]));

describe('useChatLogic › mention suggestions', () => {
  it('should update mention suggestions correctly when user types a query', async () => {
    const { result } = renderHook(() => useChatLogic());

    // Initially, suggestions should be empty
    expect(result.current.mentionSuggestions).toEqual([]);

    // Simulate user typing '@gro'
    await act(async () => {
      result.current.handleInputChange({
        target: { value: '@gro', selectionStart: 4 },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    // Suggestions should be updated with the matching category
    expect(result.current.mentionSuggestions).toEqual([
      { id: 'cat1', name: 'Groceries', type: 'category' }
    ]);

    // Simulate user clearing the input
    await act(async () => {
      result.current.handleInputChange({
        target: { value: '', selectionStart: 0 },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    });

    // Suggestions should be cleared
    expect(result.current.mentionSuggestions).toEqual([]);
  });
});