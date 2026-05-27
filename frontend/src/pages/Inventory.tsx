import React from 'react';
import InventoryList from '../components/InventoryList';
import BulkInsertForm from '../components/BulkInsertForm';

const Inventory: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      <BulkInsertForm />
      <InventoryList />
    </div>
  );
};

export default Inventory;
