import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Combobox,
  Image,
  Loader,
  Text,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { searchItems } from '../services/api';
import type { SearchResultItem } from '../types';

const getPrimaryImage = (item: SearchResultItem): string =>
  item.imageUrls?.find((url) => url?.trim()) ?? item.imageUrl ?? '';

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // No onDropdownClose inline callback — that creates a new fn reference every
  // render and causes combobox to appear "changed", triggering a render loop.
  const combobox = useCombobox();

  // runSearch only manages data state; no combobox calls → stable empty deps
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const results = await searchItems(q);
      setSuggestions(results.slice(0, 5));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce: react to query changes only. No combobox in deps.
  // Guard setSuggestions([]) with a functional update so it only triggers a
  // re-render when there was actually something to clear.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 220);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // Open/close dropdown whenever suggestions or query change.
  // combobox store is stable (Mantine uses useRef internally) — safe to call
  // without including it in deps.
  useEffect(() => {
    if (suggestions.length > 0 && query.trim()) {
      combobox.openDropdown();
    } else {
      combobox.closeDropdown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, query]);

  const goToItem = (item: SearchResultItem) => {
    setQuery('');
    setSuggestions([]);
    combobox.closeDropdown();
    navigate(`/rooms/${item.roomId._id}?highlight=${item._id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      combobox.closeDropdown();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setSuggestions([]);
    }
    if (e.key === 'Escape') {
      combobox.closeDropdown();
    }
  };

  return (
    <Combobox store={combobox} onOptionSubmit={(val) => {
      const item = suggestions.find((s) => s._id === val);
      if (item) goToItem(item);
    }}>
      <Combobox.Target>
        <TextInput
          placeholder="Search items…"
          value={query}
          onChange={(e) => { setQuery(e.currentTarget.value); combobox.openDropdown(); }}
          onFocus={() => { if (suggestions.length > 0) combobox.openDropdown(); }}
          onBlur={() => combobox.closeDropdown()}
          onKeyDown={handleKeyDown}
          leftSection={loading ? <Loader size={14} /> : <IconSearch size={14} />}
          size="sm"
          w={{ base: 110, sm: 240 }}
          styles={{ input: { borderRadius: 20 } }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {suggestions.map((item) => (
            <Combobox.Option key={item._id} value={item._id}>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {getPrimaryImage(item) ? (
                  <Image src={getPrimaryImage(item)} w={36} h={36} fit="cover" radius="sm" style={{ flexShrink: 0 }} />
                ) : (
                  <Box w={36} h={36} style={{ background: 'var(--mantine-color-gray-1)', borderRadius: 6, flexShrink: 0 }} />
                )}
                <Box style={{ minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>{item.name}</Text>
                  <Text size="xs" c="dimmed" truncate>{item.roomId.name}</Text>
                </Box>
              </Box>
            </Combobox.Option>
          ))}
          {suggestions.length > 0 && (
            <Combobox.Footer>
              <Text
                size="xs"
                c="blue"
                ta="center"
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  combobox.closeDropdown();
                  navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  setQuery('');
                  setSuggestions([]);
                }}
              >
                See all results for "{query}" →
              </Text>
            </Combobox.Footer>
          )}
          {!loading && query.trim() && suggestions.length === 0 && (
            <Combobox.Empty>No matches found</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default SearchBar;
