import { useState, useMemo } from 'react';

export default function useSortableTable(items, defaultSortKey = null, defaultSortDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState(
    defaultSortKey ? { key: defaultSortKey, direction: defaultSortDirection } : null
  );

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;
    const sortableItems = [...items];
    
    sortableItems.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nulls/undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      aValue = aValue.toString().toLowerCase();
      bValue = bValue.toString().toLowerCase();
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [items, sortConfig]);

  return { sortedItems, requestSort, sortConfig };
}
