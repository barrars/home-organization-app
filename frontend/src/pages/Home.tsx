import React from 'react';
import Navbar from '../components/Navbar';
import InventoryList from '../components/InventoryList';
import BulkInsertForm from '../components/BulkInsertForm';

const Home: React.FC = () => {
  return (
    <div className="container mx-auto">
      <Navbar />
      <h1 className="text-3xl font-bold my-4">Home Organization App</h1>
      <BulkInsertForm />
      <InventoryList />
    </div>
  );
};

export default Home;
