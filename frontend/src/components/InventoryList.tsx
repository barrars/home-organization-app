import React, { useEffect, useState } from 'react';
import { fetchInventoryItems } from '../services/api';
import type { Item } from '../types';
import AddItemModal from './AddItemModal';

const InventoryList: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [templateItem, setTemplateItem] = useState<Item | null>(null);

  const loadInventoryItems = async () => {
    try {
      const items = await fetchInventoryItems();
      setInventoryItems(items);
    } catch {
      setError('Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const handleDuplicate = (item: Item) => {
    setTemplateItem(item);
    setAddModalOpen(true);
  };

  const closeModal = () => {
    setAddModalOpen(false);
    setTemplateItem(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Inventory List</h2>
      <ul className="mt-4">
        {inventoryItems.map((item) => (
          <li key={item._id} className="border-b py-2 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>
                Category:{' '}
                {item.categories?.map((c) => (typeof c === 'string' ? c : c.name)).join(', ')}
              </p>
              <p>Tags: {item.tags.join(', ')}</p>
              <p>Notes: {item.notes}</p>
            </div>
            <button
              className="shrink-0 mt-1 text-sm text-blue-500 hover:text-blue-700"
              onClick={() => handleDuplicate(item)}
            >
              Duplicate
            </button>
          </li>
        ))}
      </ul>
      {templateItem && (
        <AddItemModal
          opened={addModalOpen}
          onClose={closeModal}
          roomId={templateItem.roomId}
          onCreated={() => {
            closeModal();
            loadInventoryItems();
          }}
          template={templateItem}
        />
      )}
    </div>
  );
};

export default InventoryList;
