import React, { useState } from 'react';
import axios from 'axios';

const BulkInsertForm: React.FC = () => {
  const [items, setItems] = useState([
    { name: '', quantity: 0, category: '', tags: '', notes: '' },
  ]);

  const handleChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [name]: value };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 0, category: '', tags: '', notes: '' }]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await axios.post('/api/inventory/bulk-insert', items);
      alert('Items added successfully!');
      setItems([{ name: '', quantity: 0, category: '', tags: '', notes: '' }]);
    } catch (error) {
      console.error('Error adding items:', error);
      alert('Failed to add items. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {items.map((item, index) => (
        <div key={index} className="mb-4">
          <input
            type="text"
            name="name"
            value={item.name}
            onChange={(event) => handleChange(index, event)}
            placeholder="Item Name"
            className="border p-2 mr-2"
            required
          />
          <input
            type="number"
            name="quantity"
            value={item.quantity}
            onChange={(event) => handleChange(index, event)}
            placeholder="Quantity"
            className="border p-2 mr-2"
            required
          />
          <input
            type="text"
            name="category"
            value={item.category}
            onChange={(event) => handleChange(index, event)}
            placeholder="Category"
            className="border p-2 mr-2"
          />
          <input
            type="text"
            name="tags"
            value={item.tags}
            onChange={(event) => handleChange(index, event)}
            placeholder="Tags"
            className="border p-2 mr-2"
          />
          <textarea
            name="notes"
            value={item.notes}
            onChange={(event) => handleChange(index, event)}
            placeholder="Notes"
            className="border p-2 mr-2"
          />
        </div>
      ))}
      <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white p-2 mb-4">
        Add Another Item
      </button>
      <button type="submit" className="bg-green-500 text-white p-2">
        Submit Items
      </button>
    </form>
  );
};

export default BulkInsertForm;
