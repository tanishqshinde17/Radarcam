import React, { useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface DestinationSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({ onSearch, onClose }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
  };

  return (
    <div className="absolute inset-x-0 top-16 z-50 px-4 flex justify-center pointer-events-none">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto w-full max-w-md bg-[#141925]/95 backdrop-blur-md border border-white/[0.08] rounded-2xl shadow-2xl p-2 flex items-center gap-2"
      >
        <MapPin className="w-5 h-5 text-blue-400 ml-2 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Where to? (e.g., Airport, Central Station)"
          autoFocus
          className="w-full bg-transparent border-none text-white placeholder-gray-500 text-sm focus:outline-none px-1 h-10"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="press bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 h-10 rounded-xl text-sm shrink-0 flex items-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          Route
        </button>
      </form>
    </div>
  );
};
